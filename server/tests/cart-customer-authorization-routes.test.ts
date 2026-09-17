import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";

const productId = "11111111-1111-4111-8111-111111111111";
const customer = { id: "customer-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", role: "seller" as const };
const admin = { ...customer, id: "admin-1", role: "admin" as const };

type Account = typeof customer | typeof seller | typeof admin | null;
type Calls = { list: number; add: number; setQuantity: number; remove: number; clear: number };

const makeApp = (account: Account, calls: Calls) => {
  const routes = createCartRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-session" ? account : null; } },
    cart: {
      async listItems() { calls.list += 1; return []; },
      async addItem() { calls.add += 1; },
      async setQuantity() { calls.setQuantity += 1; },
      async removeItem() { calls.remove += 1; },
      async clear() { calls.clear += 1; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);
  return app;
};

const requests = [
  ["GET /items", "/items", { method: "GET" }],
  ["POST /items", "/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) }],
  ["PATCH /items/:productId", `/items/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: 1 }) }],
  ["DELETE /items/:productId", `/items/${productId}`, { method: "DELETE" }],
  ["DELETE /items", "/items", { method: "DELETE" }],
] as const;

const emptyCalls = (): Calls => ({ list: 0, add: 0, setQuantity: 0, remove: 0, clear: 0 });

for (const [route, path, init] of requests) {
  test(`cart ${route} rejects seller and admin sessions before cart actions`, async () => {
    for (const account of [seller, admin]) {
      const calls = emptyCalls();
      const response = await makeApp(account, calls).request(`http://localhost/api/cart${path}`, {
        ...init,
        headers: { ...init.headers, Cookie: "nexamart_session=opaque-session" },
      });
      assert.equal(response.status, 403);
      assert.deepEqual(calls, emptyCalls());
    }
  });

  test(`cart ${route} preserves unauthenticated and customer behavior`, async () => {
    const unauthenticatedCalls = emptyCalls();
    const unauthenticated = await makeApp(null, unauthenticatedCalls).request(`http://localhost/api/cart${path}`, init);
    assert.equal(unauthenticated.status, 401);
    assert.deepEqual(unauthenticatedCalls, emptyCalls());

    const customerCalls = emptyCalls();
    const response = await makeApp(customer, customerCalls).request(`http://localhost/api/cart${path}`, {
      ...init,
      headers: { ...init.headers, Cookie: "nexamart_session=opaque-session" },
    });
    assert.ok([200, 201, 204].includes(response.status));
    assert.equal(Object.values(customerCalls).reduce((total, calls) => total + calls, 0), 1);
  });
}
