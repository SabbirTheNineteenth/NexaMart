import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createOrderRoutes } from "../src/modules/orders/order.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("checkout route ignores customer identity in the body and uses the session account", async () => {
  let received: { customerId: string; items: { productId: string; quantity: number }[]; idempotencyKey?: string; shippingAddressId?: string } | undefined;
  const routes = createOrderRoutes({
    sessions: { async resolve() { return account; } },
    orders: {
      async checkout(input: { customerId: string; items: { productId: string; quantity: number }[]; idempotencyKey?: string; shippingAddressId?: string }) { received = input; return { id: "order-1", reference: "NX-ORDER-1", customerId: input.customerId, items: [], total: 10, status: "pending" as const, paymentStatus: "unpaid" as const, createdAt: "2026-09-11T00:00:00.000Z" }; },
      async listForCustomer() { return []; }, async listForSeller() { return []; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  const response = await app.request("http://localhost/api/checkout/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "checkout-1", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ customerId: "attacker", shippingAddressId: "22222222-2222-4222-8222-222222222222", items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }] }) });
  assert.equal(response.status, 201);
  assert.deepEqual(received, { customerId: account.id, idempotencyKey: "checkout-1", shippingAddressId: "22222222-2222-4222-8222-222222222222", items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }] });
});

test("checkout rejects an invalid idempotency key before opening an order transaction", async () => {
  let checkoutCalled = false;
  const routes = createOrderRoutes({
    sessions: { async resolve() { return account; } },
    orders: {
      async checkout() { checkoutCalled = true; throw new Error("unexpected"); },
      async listForCustomer() { return []; }, async listForSeller() { return []; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  const response = await app.request("http://localhost/api/checkout/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "x", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 1 }] }) });
  assert.equal(response.status, 400);
  assert.equal(checkoutCalled, false);
});

test("customer tracking route rejects a malformed order ID before invoking the service", async () => {
  let trackingCalled = false;
  const routes = createOrderRoutes({
    sessions: { async resolve() { return account; } },
    orders: {
      async checkout() { throw new Error("not used"); }, async listForCustomer() { return []; },
      async getTrackingForCustomer() { trackingCalled = true; throw new Error("unexpected"); },
    } as never,
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  const response = await app.request("http://localhost/api/checkout/orders/not-a-uuid/tracking", { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid order" });
  assert.equal(trackingCalled, false);
});

test("customer tracking route returns 404 for a valid UUID that is absent or unowned", async () => {
  let received: { customerId: string; orderId: string } | undefined;
  const routes = createOrderRoutes({
    sessions: { async resolve() { return account; } },
    orders: {
      async checkout() { throw new Error("not used"); }, async listForCustomer() { return []; },
      async getTrackingForCustomer(input: { customerId: string; orderId: string }) { received = input; return null; },
    } as never,
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  const orderId = "44444444-4444-4444-8444-444444444444";
  const response = await app.request(`http://localhost/api/checkout/orders/${orderId}/tracking`, { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Order not found" });
  assert.deepEqual(received, { customerId: account.id, orderId });
});

test("customer tracking route scopes the order detail to the authenticated customer and excludes address data", async () => {
  let received: { customerId: string; orderId: string } | undefined;
  const tracking = {
    id: "order-1", reference: "NX-ORDER-1", status: "confirmed", paymentStatus: "unpaid", createdAt: "2026-09-11T00:00:00.000Z",
    items: [{ id: "item-1", productName: "Studio Lamp", productImageUrl: "https://example.com/lamp.jpg", quantity: 2, unitPrice: 129, fulfillmentStatus: "shipped" }],
    events: [{ id: "event-1", orderItemId: "item-1", eventType: "fulfillment_updated", fromStatus: "processing", toStatus: "shipped", note: null, createdAt: "2026-09-12T00:00:00.000Z" }],
  };
  const routes = createOrderRoutes({
    sessions: { async resolve() { return account; } },
    orders: {
      async checkout() { throw new Error("not used"); }, async listForCustomer() { return []; }, async listForSeller() { return []; },
      async getTrackingForCustomer(input: { customerId: string; orderId: string }) { received = input; return tracking; },
    } as never,
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  const orderId = "33333333-3333-4333-8333-333333333333";
  const response = await app.request(`http://localhost/api/checkout/orders/${orderId}/tracking`, { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { customerId: account.id, orderId });
  assert.deepEqual(await response.json(), { order: tracking });
});
