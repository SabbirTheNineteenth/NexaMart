import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";
import { CartService } from "../src/modules/cart/services/cart-service.js";
import { createOrderRoutes } from "../src/modules/orders/order.routes.js";
import { OrderService } from "../src/modules/orders/services/order-service.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

test("cart service keeps a variant identifier on stock checks and persisted lines", async () => {
  let stockLookup: unknown;
  let existingLookup: unknown;
  let saved: unknown;
  const cart = new CartService({
    async availableStock(input: unknown) { stockLookup = input; return 3; },
    async existingQuantity(input: unknown) { existingLookup = input; return 0; },
    async setQuantity(input: unknown) { saved = input; },
    async listItems() { return []; }, async clear() {},
  } as never);

  await cart.addItem({ accountId: account.id, productId, variantId, quantity: 2 });
  assert.deepEqual(stockLookup, { productId, variantId });
  assert.deepEqual(existingLookup, { accountId: account.id, productId, variantId });
  assert.deepEqual(saved, { accountId: account.id, productId, variantId, quantity: 2 });
});

test("cart route binds an optional variant only to the authenticated account", async () => {
  let added: unknown;
  const routes = createCartRoutes({
    sessions: { async resolve() { return account; } },
    cart: { async addItem(input: unknown) { added = input; }, async listItems() { return []; }, async setQuantity() {}, async clear() {} } as never,
  });
  const app = new Hono().basePath("/api"); app.route("/cart", routes);
  const response = await app.request("http://localhost/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid" }, body: JSON.stringify({ productId, variantId, quantity: 2 }) });
  assert.equal(response.status, 201);
  assert.deepEqual(added, { accountId: account.id, productId, variantId, quantity: 2 });
});

test("order service preserves variants and combines only matching product-variant lines", async () => {
  let received: unknown;
  const orders = new OrderService({
    async checkout(input: unknown) { received = input; return { id: "order-1", reference: "NX-1", customerId: account.id, items: [], total: 0, status: "pending" as const, paymentStatus: "unpaid" as const, createdAt: account.createdAt }; },
    async listForCustomer() { return []; }, async listForSeller() { return []; }, async getTrackingForCustomer() { return null; },
  } as never);
  await orders.checkout({ customerId: account.id, shippingAddressId: productId, idempotencyKey: "checkout-1", items: [{ productId, variantId, quantity: 1 }, { productId, variantId, quantity: 2 }, { productId, quantity: 3 }] });
  assert.deepEqual(received, { customerId: account.id, shippingAddressId: productId, idempotencyKey: "checkout-1", items: [{ productId, variantId, quantity: 3 }, { productId, quantity: 3 }] });
});

test("checkout route forwards an optional variant without accepting a body customer identity", async () => {
  let received: unknown;
  const routes = createOrderRoutes({
    sessions: { async resolve() { return account; } },
    orders: { async checkout(input: unknown) { received = input; return { id: "order-1", reference: "NX-1", customerId: account.id, items: [], total: 0, status: "pending" as const, paymentStatus: "unpaid" as const, createdAt: account.createdAt }; }, async listForCustomer() { return []; }, async getTrackingForCustomer() { return null; } } as never,
  });
  const app = new Hono().basePath("/api"); app.route("/checkout", routes);
  const response = await app.request("http://localhost/api/checkout/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "checkout-1", Cookie: "nexamart_session=valid" }, body: JSON.stringify({ customerId: "attacker", shippingAddressId: productId, items: [{ productId, variantId, quantity: 1 }] }) });
  assert.equal(response.status, 201);
  assert.deepEqual(received, { customerId: account.id, shippingAddressId: productId, idempotencyKey: "checkout-1", items: [{ productId, variantId, quantity: 1 }] });
});

test("variant cart and order persistence add nullable references and immutable snapshots", () => {
  const schema = readFileSync(new URL("../src/db/schema/index.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../src/db/migrations/0015_variant_cart_checkout.sql", import.meta.url), "utf8");
  const cartRepository = readFileSync(new URL("../src/modules/cart/postgres-cart.repository.ts", import.meta.url), "utf8");
  const orderRepository = readFileSync(new URL("../src/modules/orders/postgres-order.repository.ts", import.meta.url), "utf8");
  assert.match(schema, /variantId: uuid\("variant_id"\).*productVariants\.id/);
  assert.match(schema, /variantSku: varchar\("variant_sku"/);
  assert.match(schema, /variantOptions: jsonb\("variant_options"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "variant_id" uuid REFERENCES "product_variants"\("id"\) ON DELETE SET NULL/);
  assert.match(migration, /DROP INDEX IF EXISTS "cart_items_account_product_unique"/);
  assert.match(migration, /"cart_items_account_product_variant_unique"/);
  assert.match(cartRepository, /eq\(productVariants\.productId, input\.productId\)/);
  assert.match(orderRepository, /gte\(productVariants\.stock, item\.quantity\)/);
  assert.match(orderRepository, /variantSku: item\.variantSku/);
  assert.match(orderRepository, /variantOptions: item\.variantOptions/);
});

test("checkout inventory updates require an active owning seller in the transaction", () => {
  const orderRepository = readFileSync(new URL("../src/modules/orders/postgres-order.repository.ts", import.meta.url), "utf8");

  assert.match(orderRepository, /sellerProfiles/);
  assert.match(orderRepository, /const activeSellerProduct = exists\(tx\.select\(\{ id: products\.id \}\)\.from\(products\)\.innerJoin\(sellerProfiles, and\(eq\(sellerProfiles\.accountId, products\.sellerId\), eq\(sellerProfiles\.status, "active"\)\)\)\.where\(and\(eq\(products\.id, item\.productId\), eq\(products\.isPublished, true\)\)\)\);/);
  assert.equal((orderRepository.match(/activeSellerProduct/g) ?? []).length, 3);
});
