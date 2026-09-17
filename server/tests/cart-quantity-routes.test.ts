import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("cart quantity route binds updates to the authenticated account", async () => {
  let received: unknown;
  const routes = createCartRoutes({ sessions: { async resolve() { return account; } }, cart: { async addItem() {}, async listItems() { return []; }, async setQuantity(input: unknown) { received = input; } } });
  const app = new Hono().basePath("/api"); app.route("/cart", routes);
  const response = await app.request("http://localhost/api/cart/items/11111111-1111-4111-8111-111111111111", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid" }, body: JSON.stringify({ quantity: 3 }) });
  assert.equal(response.status, 204);
  assert.deepEqual(received, { accountId: account.id, productId: "11111111-1111-4111-8111-111111111111", quantity: 3 });
});
