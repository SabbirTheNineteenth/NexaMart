import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { createAuthGuard, getAuthenticatedAccount } from "./auth.guard.js";
import { AuthAdmissionController, type AuthAdmissionConfiguration } from "./auth-admission.js";
import type { PublicAccount, Role } from "./auth.types.js";

type AuthRouteDependencies = {
  auth: {
    register(input: { name: string; email: string; password: string; role?: Role }): Promise<PublicAccount>;
    login(email: string, password: string): Promise<PublicAccount | null>;
  };
  sessions: {
    create(accountId: string): Promise<{ token: string; expiresAt: Date }>;
    resolve(token: string): Promise<PublicAccount | null>;
    revoke(token: string): Promise<void>;
  };
  secureCookies: boolean;
  admission?: AuthAdmissionConfiguration;
};

const maxPasswordBytes = 72;
const password = z.string().min(8).refine((value) => Buffer.byteLength(value, "utf8") <= maxPasswordBytes, { message: "Password must be at most 72 bytes" });
const credentials = z.object({ name: z.string().min(2).optional(), email: z.string().email(), password });
const credentialError = (parsed: z.SafeParseError<unknown>, fallback: string) => parsed.error.issues.some((issue) => issue.message === "Password must be at most 72 bytes") ? "Password must be at most 72 bytes" : fallback;
const isDuplicateAccountError = (error: unknown) => error instanceof Error && error.message === "Account already exists";

export const createAuthRoutes = ({ auth, sessions, secureCookies, admission }: AuthRouteDependencies) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  const admissions = new AuthAdmissionController(admission);
  const denyAdmission = (c: Context, retryAfterSeconds: number) => {
    c.header("Retry-After", String(Math.max(1, Math.ceil(retryAfterSeconds))));
    return c.json({ error: "Too many authentication attempts" }, 429);
  };
  const requireClientAdmission = async (c: Context, next: () => Promise<void>) => {
    const result = await admissions.admitClient(c);
    if (!result.allowed) return denyAdmission(c, result.retryAfterSeconds);
    await next();
  };
  const attachSession = async (c: Context, account: PublicAccount) => {
    const session = await sessions.create(account.id);
    setCookie(c, "nexamart_session", session.token, { httpOnly: true, secure: secureCookies, sameSite: "Lax", path: "/", expires: session.expiresAt });
    return c.json({ account });
  };

  routes.use("/register", requireClientAdmission);
  routes.use("/login", requireClientAdmission);
  routes.post("/register", async (c) => {
    const parsed = credentials.extend({ name: z.string().min(2) }).safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: credentialError(parsed, "Invalid registration details") }, 400);
    const input = { ...parsed.data, email: parsed.data.email.trim().toLowerCase() };
    const admitted = await admissions.admitAccount(input.email);
    if (!admitted.allowed) return denyAdmission(c, admitted.retryAfterSeconds);
    try { return await attachSession(c, await auth.register(input)); } catch (error) { return c.json({ error: "Unable to create account" }, isDuplicateAccountError(error) ? 409 : 500); }
  });
  routes.post("/login", async (c) => {
    const parsed = credentials.pick({ email: true, password: true }).safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: credentialError(parsed, "Invalid email or password") }, 401);
    const input = { ...parsed.data, email: parsed.data.email.trim().toLowerCase() };
    const admitted = await admissions.admitAccount(input.email);
    if (!admitted.allowed) return denyAdmission(c, admitted.retryAfterSeconds);
    try {
      const account = await auth.login(input.email, input.password);
      return account ? await attachSession(c, account) : c.json({ error: "Invalid email or password" }, 401);
    } catch { return c.json({ error: "Unable to log in" }, 500); }
  });
  routes.post("/logout", async (c) => {
    const token = getCookie(c, "nexamart_session");
    if (token) {
      try { await sessions.revoke(token); } catch { return c.json({ error: "Unable to log out" }, 500); }
    }
    deleteCookie(c, "nexamart_session", { path: "/", secure: secureCookies, httpOnly: true, sameSite: "Lax" });
    return c.body(null, 204);
  });
  routes.get("/me", guard.requireAccount, (c) => c.json({ account: getAuthenticatedAccount(c) }));
  return routes;
};
