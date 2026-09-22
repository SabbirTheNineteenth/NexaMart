import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAuthRoutes } from "../src/modules/auth/auth.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

const sessions = { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } };

type LimiterCall = { key: string; limit: number; windowMs: number };
const scriptedLimiter = (...outcomes: { allowed: boolean; retryAfterSeconds?: number }[]) => {
  const calls: LimiterCall[] = [];
  return {
    calls,
    consume(key: string, limit: number, windowMs: number) {
      calls.push({ key, limit, windowMs });
      return outcomes.shift() ?? { allowed: true };
    },
  };
};

test("login creates an HTTP-only session cookie", async () => {
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie") ?? "";
  assert.match(cookie, /nexamart_session=opaque-session-token/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
});

test("login keeps incorrect credentials indistinguishable from a missing account", async () => {
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return null; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "wrong-password" }) });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Invalid email or password" });
});

test("local QA allows a bounded practical number of invalid login attempts before admission blocks them", async () => {
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return null; } },
    sessions,
    secureCookies: false,
    admission: {
      environment: { NODE_ENV: "test", NEXAMART_LOCAL_QA: "1", PORT: "3004" },
      getDirectClientAddress: () => "127.0.0.1",
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);
  const request = () => app.request("http://localhost:3004/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: "wrong-password" }),
  });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    assert.equal((await request()).status, 401);
  }

  const blocked = await request();
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("Retry-After"), "900");
  assert.deepEqual(await blocked.json(), { error: "Too many authentication attempts" });
});

test("local QA admission still permits a valid login below its bounded threshold", async () => {
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions,
    secureCookies: false,
    admission: {
      environment: { NODE_ENV: "test", NEXAMART_LOCAL_QA: "1", PORT: "3004" },
      getDirectClientAddress: () => "127.0.0.1",
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost:3004/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: "secure-pass" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { account });
});

test("login rejects malformed JSON with its established credential contract", async () => {
  let attemptedLogin = false;
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { attemptedLogin = true; return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Invalid email or password" });
  assert.equal(attemptedLogin, false);
});

test("login returns a safe server error when session creation fails", async () => {
  const sessionFailure = new Error('session store unavailable at postgres://internal-db/10.0.0.5');
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: { async create() { throw sessionFailure; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });
  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to log in" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});

test("login returns a safe server error when authentication lookup fails", async () => {
  const authenticationFailure = new Error('connect ECONNREFUSED postgres://internal-db at 10.0.0.5');
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { throw authenticationFailure; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });
  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to log in" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});

test("registration returns a safe server error when session creation fails", async () => {
  const sessionFailure = new Error('session store unavailable at postgres://internal-db/10.0.0.5');
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: { async create() { throw sessionFailure; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: account.name, email: account.email, password: "secure-pass" }) });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to create account" });
});

test("registration rejects malformed JSON with its established validation contract", async () => {
  let registered = false;
  const routes = createAuthRoutes({
    auth: { async register() { registered = true; return account; }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid registration details" });
  assert.equal(registered, false);
});

test("registration preserves its generic duplicate-account conflict", async () => {
  const routes = createAuthRoutes({
    auth: { async register() { throw new Error("Account already exists"); }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: account.name, email: account.email, password: "secure-pass" }) });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Unable to create account" });
});

test("registration returns a safe server error when account persistence fails", async () => {
  const persistenceFailure = new Error('password authentication failed for user "postgres" at 10.0.0.5');
  const routes = createAuthRoutes({
    auth: { async register() { throw persistenceFailure; }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: account.name, email: account.email, password: "secure-pass" }) });
  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to create account" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});

test("registration rejects passwords that exceed bcrypt's 72-byte UTF-8 limit", async () => {
  let registered = false;
  const routes = createAuthRoutes({
    auth: { async register() { registered = true; return account; }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: account.name, email: account.email, password: "😀".repeat(19) }) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Password must be at most 72 bytes" });
  assert.equal(registered, false);
});

test("login rejects passwords that exceed bcrypt's 72-byte UTF-8 limit", async () => {
  let attemptedLogin = false;
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { attemptedLogin = true; return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "😀".repeat(19) }) });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Password must be at most 72 bytes" });
  assert.equal(attemptedLogin, false);
});

test("auth admission returns generic 429 with Retry-After at the configured coarse threshold", async () => {
  let loginCalls = 0;
  const limiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: false, retryAfterSeconds: 17 });
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { loginCalls += 1; return account; } },
    sessions,
    secureCookies: false,
    admission: { limiter, ipLimit: 1, accountLimit: 10, windowMs: 60_000, getDirectClientAddress: () => "198.51.100.7" },
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const first = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });
  const second = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });
  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.deepEqual(await second.json(), { error: "Too many authentication attempts" });
  assert.equal(second.headers.get("Retry-After"), "17");
  assert.equal(loginCalls, 1);
});

test("coarse admission runs before parsing or authentication work", async () => {
  let loginCalls = 0;
  const limiter = scriptedLimiter({ allowed: false, retryAfterSeconds: 9 });
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { loginCalls += 1; throw new Error("bcrypt must not run"); } },
    sessions,
    secureCookies: false,
    admission: { limiter, ipLimit: 1, accountLimit: 10, windowMs: 60_000, getDirectClientAddress: () => "198.51.100.8" },
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(response.status, 429);
  assert.equal(loginCalls, 0);
  assert.equal(limiter.calls.length, 1);
});

test("a thrown admission limiter failure fails closed before authentication", async () => {
  let loginCalls = 0;
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { loginCalls += 1; return account; } }, sessions, secureCookies: false,
    admission: { limiter: { consume() { throw new Error("limiter unavailable"); } }, getDirectClientAddress: () => "198.51.100.12" },
  });
  const app = new Hono().basePath("/api"); app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(await response.json(), { error: "Too many authentication attempts" });
  assert.equal(loginCalls, 0);
});

test("a rejected admission limiter failure fails closed before authentication", async () => {
  let loginCalls = 0;
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { loginCalls += 1; return account; } }, sessions, secureCookies: false,
    admission: { limiter: { async consume() { throw new Error("limiter unavailable"); } }, getDirectClientAddress: () => "198.51.100.13" },
  });
  const app = new Hono().basePath("/api"); app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.deepEqual(await response.json(), { error: "Too many authentication attempts" });
  assert.equal(loginCalls, 0);
});

test("malformed login payload consumes the coarse IP budget", async () => {
  let loginCalls = 0;
  const limiter = scriptedLimiter({ allowed: true }, { allowed: false, retryAfterSeconds: 12 });
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { loginCalls += 1; return account; } },
    sessions,
    secureCookies: false,
    admission: { limiter, ipLimit: 1, accountLimit: 10, windowMs: 60_000, getDirectClientAddress: () => "198.51.100.9" },
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const malformed = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  const blocked = await app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });
  assert.equal(malformed.status, 401);
  assert.equal(blocked.status, 429);
  assert.equal(loginCalls, 0);
  assert.equal(limiter.calls.length, 2);
});

test("account admission is equivalent for unknown and existing normalized login emails", async () => {
  const unknownLimiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: true }, { allowed: false, retryAfterSeconds: 7 });
  const existingLimiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: true }, { allowed: false, retryAfterSeconds: 7 });
  const makeApp = (limiter: ReturnType<typeof scriptedLimiter>, email: string, result: typeof account | null) => {
    const routes = createAuthRoutes({
      auth: { async register() { return account; }, async login() { return result; } }, sessions, secureCookies: false,
      admission: { limiter, ipLimit: 10, accountLimit: 1, windowMs: 60_000, getDirectClientAddress: () => "203.0.113.4" },
    });
    const app = new Hono().basePath("/api"); app.route("/auth", routes);
    return [app, email] as const;
  };
  const [unknownApp, unknownEmail] = makeApp(unknownLimiter, "Missing@example.com", null);
  const [existingApp, existingEmail] = makeApp(existingLimiter, "SABBIR@EXAMPLE.COM", account);
  const request = (app: Hono, email: string) => app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "secure-pass" }) });

  await request(unknownApp, unknownEmail); await request(existingApp, existingEmail);
  const unknownBlocked = await request(unknownApp, unknownEmail);
  const existingBlocked = await request(existingApp, existingEmail);
  assert.equal(unknownBlocked.status, 429);
  assert.equal(existingBlocked.status, 429);
  assert.deepEqual(await unknownBlocked.json(), await existingBlocked.json());
  assert.equal(unknownBlocked.headers.get("Retry-After"), existingBlocked.headers.get("Retry-After"));
  assert.notEqual(unknownLimiter.calls[1]?.key, unknownEmail.toLowerCase());
  assert.notEqual(existingLimiter.calls[1]?.key, existingEmail.toLowerCase());
  assert.match(existingLimiter.calls[1]?.key ?? "", /^account:[A-Za-z0-9_-]+$/);
});

test("untrusted requests ignore spoofed X-Forwarded-For for coarse admission", async () => {
  const limiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: false, retryAfterSeconds: 11 });
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } }, sessions, secureCookies: false,
    admission: { limiter, ipLimit: 1, accountLimit: 10, windowMs: 60_000, getDirectClientAddress: () => "10.0.0.8" },
  });
  const app = new Hono().basePath("/api"); app.route("/auth", routes);
  const request = (forwarded: string) => app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": forwarded }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });

  assert.equal((await request("198.51.100.1")).status, 200);
  assert.equal((await request("198.51.100.2")).status, 429);
  assert.equal(limiter.calls[0]?.key, limiter.calls[2]?.key);
  assert.equal(limiter.calls[0]?.key?.includes("10.0.0.8"), false);
});

test("untrusted direct peers ignore spoofed X-Forwarded-For when proxy trust is enabled", async () => {
  const limiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: false, retryAfterSeconds: 13 });
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } }, sessions, secureCookies: false,
    admission: {
      limiter, ipLimit: 1, accountLimit: 10, windowMs: 60_000,
      environment: { AUTH_TRUST_PROXY: "true", AUTH_TRUSTED_PROXY_ADDRESSES: "10.0.0.8" },
      getDirectClientAddress: () => "10.0.0.9",
    },
  });
  const app = new Hono().basePath("/api"); app.route("/auth", routes);
  const request = (forwarded: string) => app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": forwarded }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });

  assert.equal((await request("198.51.100.1")).status, 200);
  assert.equal((await request("198.51.100.2")).status, 429);
  assert.equal(limiter.calls[0]?.key, limiter.calls[2]?.key);
  assert.equal(limiter.calls[0]?.key?.includes("10.0.0.9"), false);
});

test("missing or malformed trusted-proxy allowlists fail closed to the direct peer", async () => {
  for (const allowlist of [undefined, "not-an-ip"]) {
    const limiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: false, retryAfterSeconds: 13 });
    const routes = createAuthRoutes({
      auth: { async register() { return account; }, async login() { return account; } }, sessions, secureCookies: false,
      admission: {
        limiter, ipLimit: 1, accountLimit: 10, windowMs: 60_000,
        environment: { AUTH_TRUST_PROXY: "true", AUTH_TRUSTED_PROXY_ADDRESSES: allowlist },
        getDirectClientAddress: () => "10.0.0.8",
      },
    });
    const app = new Hono().basePath("/api"); app.route("/auth", routes);
    const request = (forwarded: string) => app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": forwarded }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });

    assert.equal((await request("198.51.100.1")).status, 200);
    assert.equal((await request("198.51.100.2")).status, 429);
    assert.equal(limiter.calls[0]?.key, limiter.calls[2]?.key);
  }
});

test("coarse admission hashes direct client addresses while retaining distinct client budgets", async () => {
  let directAddress = "198.51.100.31";
  const limiter = scriptedLimiter({ allowed: true }, { allowed: true }, { allowed: true }, { allowed: true });
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } }, sessions, secureCookies: false,
    admission: { limiter, ipLimit: 10, accountLimit: 10, windowMs: 60_000, getDirectClientAddress: () => directAddress },
  });
  const app = new Hono().basePath("/api"); app.route("/auth", routes);
  const request = () => app.request("http://localhost/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: "secure-pass" }) });

  await request();
  directAddress = "198.51.100.32";
  await request();

  const firstIpKey = limiter.calls[0]?.key ?? "";
  const secondIpKey = limiter.calls[2]?.key ?? "";
  assert.equal(firstIpKey.includes("198.51.100.31"), false);
  assert.equal(secondIpKey.includes("198.51.100.32"), false);
  assert.notEqual(firstIpKey, secondIpKey);
  assert.match(firstIpKey, /^ip:[A-Za-z0-9_-]+$/);
  assert.match(secondIpKey, /^ip:[A-Za-z0-9_-]+$/);
});

test("current-account route resolves the session from an HTTP-only cookie", async () => {
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: {
      async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; },
      async resolve(token: string) { return token === "opaque-session-token" ? account : null; },
    },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/me", { headers: { Cookie: "nexamart_session=opaque-session-token" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { account });
});

test("logout remains successful without a session cookie", async () => {
  let revokeCalls = 0;
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; }, async revoke() { revokeCalls += 1; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/logout", { method: "POST" });
  assert.equal(response.status, 204);
  assert.equal(revokeCalls, 0);
});

test("logout returns a safe server error when session revocation fails", async () => {
  const revokeFailure = new Error('ECONNRESET postgres://internal-db at 10.0.0.5');
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: { async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; }, async revoke() { throw revokeFailure; } },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/logout", { method: "POST", headers: { Cookie: "nexamart_session=opaque-session-token" } });
  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to log out" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});

test("logout revokes the server session and clears its cookie", async () => {
  let revokedToken = "";
  const routes = createAuthRoutes({
    auth: { async register() { return account; }, async login() { return account; } },
    sessions: {
      async create() { return { token: "opaque-session-token", expiresAt: new Date("2026-09-18T00:00:00.000Z") }; },
      async resolve() { return account; },
      async revoke(token: string) { revokedToken = token; },
    },
    secureCookies: false,
  });
  const app = new Hono().basePath("/api");
  app.route("/auth", routes);

  const response = await app.request("http://localhost/api/auth/logout", { method: "POST", headers: { Cookie: "nexamart_session=opaque-session-token" } });
  assert.equal(response.status, 204);
  assert.equal(revokedToken, "opaque-session-token");
  const clearedCookie = response.headers.get("set-cookie") ?? "";
  assert.match(clearedCookie, /nexamart_session=;/);
  assert.match(clearedCookie, /Path=\//i);
  assert.match(clearedCookie, /Max-Age=0/i);
  assert.match(clearedCookie, /Expires=/i);
});
