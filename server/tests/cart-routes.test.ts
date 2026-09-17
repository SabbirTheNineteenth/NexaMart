import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("cart add route requires a session and persists the authenticated account item", async () => {
  let added: { accountId: string; productId: string; quantity: number } | undefined;
  const routes = createCartRoutes({
    sessions: { async resolve(token: string) { return token === "valid-token" ? account : null; } },
    cart: { async addItem(input: { accountId: string; productId: string; quantity: number }) { added = input; }, async listItems() { return []; }, async setQuantity() {}, async clear() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);

  const unauthenticated = await app.request("http://localhost/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }) });
  assert.equal(unauthenticated.status, 401);

  const response = await app.request("http://localhost/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }) });
  assert.equal(response.status, 201);
  assert.deepEqual(added, { accountId: account.id, productId: "11111111-1111-4111-8111-111111111111", quantity: 2 });
});

test("cart read route returns only the authenticated account items", async () => {
  const routes = createCartRoutes({
    sessions: { async resolve() { return account; } },
    cart: {
      async addItem() {},
      async listItems(accountId: string) { return [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2, accountId }]; },
      async setQuantity() {}, async clear() {},
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);
  const response = await app.request("http://localhost/api/cart/items", { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2, accountId: account.id }] });
});

test("cart read route returns a safe JSON error when listing items fails", async () => {
  const routes = createCartRoutes({
    sessions: { async resolve() { return account; } },
    cart: {
      async addItem() {},
      async listItems() { throw new Error("database password=cart-list-secret"); },
      async setQuantity() {}, async clear() {},
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);

  const response = await app.request("http://localhost/api/cart/items", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Unable to list cart items" });
});

