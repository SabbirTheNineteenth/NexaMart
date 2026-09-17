import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("cart clear route scopes deletion to the authenticated account", async () => {
  let cleared = "";
  const routes = createCartRoutes({ sessions: { async resolve() { return account; } }, cart: { async addItem() {}, async listItems() { return []; }, async setQuantity() {}, async clear(accountId: string) { cleared = accountId; } } });
  const app = new Hono().basePath("/api"); app.route("/cart", routes);
  const response = await app.request("http://localhost/api/cart/items", { method: "DELETE", headers: { Cookie: "nexamart_session=valid" } });
  assert.equal(response.status, 204); assert.equal(cleared, account.id);
});

test("cart clear route returns a safe JSON error when clearing fails", async () => {
  const routes = createCartRoutes({
    sessions: { async resolve() { return account; } },
    cart: {
      async addItem() {}, async listItems() { return []; }, async setQuantity() {},
      async clear() { throw new Error("database password=cart-clear-secret"); },
    },
  });
  const app = new Hono().basePath("/api"); app.route("/cart", routes);

  const response = await app.request("http://localhost/api/cart/items", { method: "DELETE", headers: { Cookie: "nexamart_session=valid" } });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Unable to clear cart" });
});
