import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";
import { createOrderRoutes } from "../src/modules/orders/order.routes.js";

const customer = { id: "customer-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const productId = "11111111-1111-4111-8111-111111111111";

const cartApp = (addItem: () => Promise<void>) => {
  const routes = createCartRoutes({
    sessions: { async resolve() { return customer; } },
    cart: { addItem, async listItems() { return []; }, async setQuantity() {}, async clear() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);
  return app;
};

test("cart add returns a generic 500 response when persistence throws an unexpected error", async () => {
  const response = await cartApp(async () => { throw new Error('relation "cart_items" does not exist'); }).request("http://localhost/api/cart/items", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" },
    body: JSON.stringify({ productId, quantity: 1 }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to add cart item" });
});

const cartQuantityApp = (setQuantity: () => Promise<void>) => {
  const routes = createCartRoutes({
    sessions: { async resolve() { return customer; } },
    cart: { async addItem() {}, async listItems() { return []; }, setQuantity, async clear() {} },
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);
  return app;
};

test("cart quantity update returns a generic 500 response when persistence throws an unexpected error", async () => {
  const response = await cartQuantityApp(async () => { throw new Error("duplicate key value violates unique constraint cart_items_pkey"); }).request(`http://localhost/api/cart/items/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" },
    body: JSON.stringify({ quantity: 1 }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to update cart" });
});

const checkoutApp = (checkout: () => Promise<unknown>) => {
  const routes = createOrderRoutes({
    sessions: { async resolve() { return customer; } },
    orders: { checkout, async listForCustomer() { return []; }, async getTrackingForCustomer() { return null; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  return app;
};

test("checkout returns a generic 500 response when the transaction throws an unexpected error", async () => {
  const response = await checkoutApp(async () => { throw new Error("connection terminated unexpectedly for postgres://orders.internal"); }).request("http://localhost/api/checkout/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "checkout-1", Cookie: "nexamart_session=valid-token" },
    body: JSON.stringify({ shippingAddressId: "22222222-2222-4222-8222-222222222222", items: [{ productId, quantity: 1 }] }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Checkout failed" });
});

test("cart routes retain the established insufficient-stock conflict response", async () => {
  for (const request of [
    () => cartApp(async () => { throw new Error("Insufficient stock"); }).request("http://localhost/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ productId, quantity: 1 }) }),
    () => cartQuantityApp(async () => { throw new Error("Insufficient stock"); }).request(`http://localhost/api/cart/items/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ quantity: 1 }) }),
  ]) {
    const response = await request();
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: "Insufficient stock" });
  }
});

test("checkout retains only established domain conflict messages", async () => {
  for (const message of ["A shipping address is unavailable", "A product or variant is unavailable or out of stock", "A product seller is unavailable"]) {
    const response = await checkoutApp(async () => { throw new Error(message); }).request("http://localhost/api/checkout/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "checkout-1", Cookie: "nexamart_session=valid-token" },
      body: JSON.stringify({ shippingAddressId: "22222222-2222-4222-8222-222222222222", items: [{ productId, quantity: 1 }] }),
    });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { error: message });
  }
});
