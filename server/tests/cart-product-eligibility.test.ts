import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";
import { CartService, ProductUnavailableError } from "../src/modules/cart/services/cart-service.js";

const account = { id: "account-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-12T00:00:00.000Z" };
const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

const unavailableCart = () => new CartService({
  async availableStock() { return null; },
  async existingQuantity() { return 0; },
  async listItems() { return []; },
  async setQuantity() { throw new Error("must not persist unavailable products"); },
} as never);

for (const reason of ["unpublished", "suspended seller", "missing seller"] as const) {
  test(`cart add rejects an unavailable ${reason} product`, async () => {
    await assert.rejects(() => unavailableCart().addItem({ accountId: account.id, productId, quantity: 1 }), ProductUnavailableError);
  });

  test(`cart quantity rejects a ${reason} product as unavailable`, async () => {
    await assert.rejects(() => unavailableCart().setQuantity({ accountId: account.id, productId, quantity: 1 }), ProductUnavailableError);
  });
}

test("cart accepts active seller base and variant products", async () => {
  const persisted: unknown[] = [];
  const cart = new CartService({
    async availableStock() { return 4; },
    async existingQuantity() { return 0; },
    async listItems() { return []; },
    async setQuantity(input: unknown) { persisted.push(input); },
  } as never);

  await cart.addItem({ accountId: account.id, productId, quantity: 1 });
  await cart.addItem({ accountId: account.id, productId, variantId, quantity: 2 });
  assert.deepEqual(persisted, [
    { accountId: account.id, productId, quantity: 1 },
    { accountId: account.id, productId, variantId, quantity: 2 },
  ]);
});

test("cart routes return the documented unavailable-product conflict without leaking unexpected errors", async () => {
  const routes = createCartRoutes({
    sessions: { async resolve() { return account; } },
    cart: {
      async addItem() { throw new ProductUnavailableError(); },
      async setQuantity() { throw new ProductUnavailableError(); },
      async listItems() { return []; },
      async clear() {},
    },
  });
  const app = new Hono().basePath("/api"); app.route("/cart", routes);

  for (const request of [
    app.request("http://localhost/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid" }, body: JSON.stringify({ productId, quantity: 1 }) }),
    app.request(`http://localhost/api/cart/items/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid" }, body: JSON.stringify({ quantity: 1 }) }),
  ]) {
    const response = await request;
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "A product or variant is unavailable" });
  }
});

test("persistent cart reads hide ineligible rows without deleting them", () => {
  const source = readFileSync(new URL("../src/modules/cart/postgres-cart.repository.ts", import.meta.url), "utf8");
  assert.match(source, /sellerProfiles/);
  assert.match(source, /innerJoin\(sellerProfiles, and\(eq\(sellerProfiles\.accountId, products\.sellerId\), eq\(sellerProfiles\.status, "active"\)\)\)/);
  assert.match(source, /eq\(products\.isPublished, true\)/);
  assert.doesNotMatch(source.match(/async listItems[\s\S]*?(?=\n {2}async |\n})/)?.[0] ?? "", /db\.delete\(cartItems\)/);
});
