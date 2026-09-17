import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { PublicAccount, Role } from "./auth.types.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };

export const getAuthenticatedAccount = (context: Context) => context.get("account" as never) as PublicAccount | undefined;

export const createAuthGuard = (sessions: SessionResolver) => {
  const requireAccount: MiddlewareHandler = async (c, next) => {
    const token = getCookie(c, "nexamart_session");
    let account: PublicAccount | null = null;
    if (token) {
      try {
        account = await sessions.resolve(token);
      } catch {
        return c.json({ error: "Authentication resolution failed" }, 500);
      }
    }
    if (!account) return c.json({ error: "Authentication required" }, 401);
    c.set("account", account);
    await next();
  };

  const requireRole = (...roles: Role[]): MiddlewareHandler => async (c, next) => {
    const account = c.get("account") as PublicAccount | undefined;
    if (!account) return c.json({ error: "Authentication required" }, 401);
    if (!roles.includes(account.role)) return c.json({ error: "Forbidden" }, 403);
    await next();
  };

  return { requireAccount, requireRole };
};
