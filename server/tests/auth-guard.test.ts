import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAuthGuard } from "../src/modules/auth/auth.guard.js";

test("role guard rejects customers from seller-only routes", async () => {
  const guard = createAuthGuard({
    async resolve() { return { id: "customer-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" }; },
  });
  const app = new Hono();
  app.get("/seller", guard.requireAccount, guard.requireRole("seller"), (c) => c.json({ ok: true }));

  const response = await app.request("http://localhost/seller", { headers: { Cookie: "nexamart_session=opaque-token" } });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("account guard contains resolver failures in a safe JSON response", async () => {
  const secret = "postgres://admin:super-secret@database/nexamart";
  const guard = createAuthGuard({
    async resolve() { throw new Error(`session lookup failed: ${secret}`); },
  });
  const app = new Hono();
  let protectedHandlerCalls = 0;
  app.get("/protected", guard.requireAccount, (c) => {
    protectedHandlerCalls += 1;
    return c.json({ ok: true });
  });

  const response = await app.request("http://localhost/protected", { headers: { Cookie: "nexamart_session=opaque-token" } });
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
  assert.deepEqual(body, { error: "Authentication resolution failed" });
  assert.equal(JSON.stringify(body).includes(secret), false);
  assert.equal(protectedHandlerCalls, 0);
});
