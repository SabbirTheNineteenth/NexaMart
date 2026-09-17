import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createWishlistRoutes } from "../src/modules/wishlist/wishlist.routes.js";

const customer = { id: "customer-1", name: "Sabbir", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-12T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", email: "seller@example.com", role: "seller" as const };
const admin = { ...customer, id: "admin-1", email: "admin@example.com", role: "admin" as const };
const productId = "11111111-1111-4111-8111-111111111111";

function makeApp(account: typeof customer | typeof seller | typeof admin | null, calls: { add: number; list: number }) {
  const routes = createWishlistRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-session" ? account : null; } },
    wishlist: {
      async add() { calls.add += 1; },
      async list() { calls.list += 1; return []; },
      async remove() {},
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/wishlist", routes);
  return app;
}

test("wishlist add and read reject unauthenticated, seller, and admin sessions before repository actions", async () => {
  for (const account of [null, seller, admin]) {
    const calls = { add: 0, list: 0 };
    const app = makeApp(account, calls);
    const headers = account ? { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session" } : { "Content-Type": "application/json" };
    const expectedStatus = account ? 403 : 401;

    const [add, list] = await Promise.all([
      app.request("http://localhost/api/wishlist/items", { method: "POST", headers, body: JSON.stringify({ productId }) }),
      app.request("http://localhost/api/wishlist/items", { headers }),
    ]);

    assert.equal(add.status, expectedStatus);
    assert.equal(list.status, expectedStatus);
    assert.deepEqual(calls, { add: 0, list: 0 });
  }
});
