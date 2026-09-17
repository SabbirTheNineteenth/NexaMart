import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createOrderRoutes } from "../src/modules/orders/order.routes.js";

const customer = { id: "customer-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", email: "seller@example.com", role: "seller" as const };
const admin = { ...customer, id: "admin-1", email: "admin@example.com", role: "admin" as const };
type Account = typeof customer | typeof seller | typeof admin | null;
type Calls = { list: string[]; tracking: { customerId: string; orderId: string }[]; checkout: { customerId: string; shippingAddressId: string; items: { productId: string; quantity: number }[]; idempotencyKey: string }[] };

const shippingAddressId = "22222222-2222-4222-8222-222222222222";
const productId = "11111111-1111-4111-8111-111111111111";
const trackingOrderId = "33333333-3333-4333-8333-333333333333";
const emptyCalls = (): Calls => ({ list: [], tracking: [], checkout: [] });

const makeApp = (account: Account, calls: Calls) => {
  const routes = createOrderRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-session" ? account : null; } },
    orders: {
      async listForCustomer(customerId: string) { calls.list.push(customerId); return []; },
      async getTrackingForCustomer(input: { customerId: string; orderId: string }) { calls.tracking.push(input); return { id: input.orderId, reference: "NX-ORDER-1" }; },
      async checkout(input: { customerId: string; shippingAddressId: string; items: { productId: string; quantity: number }[]; idempotencyKey: string }) {
        calls.checkout.push(input);
        return { id: "order-1", reference: "NX-ORDER-1", customerId: input.customerId, items: [], total: 10, status: "pending" as const, paymentStatus: "unpaid" as const, createdAt: "2026-09-11T00:00:00.000Z" };
      },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/checkout", routes);
  return app;
};

const orderRequests = [
  ["GET /orders", "/orders", { method: "GET" }],
  ["GET /orders/:orderId/tracking", "/orders/order-1/tracking", { method: "GET" }],
  ["POST /orders", "/orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": "checkout-1" }, body: JSON.stringify({ shippingAddressId, items: [{ productId, quantity: 1 }] }) }],
] as const;

for (const [route, path, init] of orderRequests) {
  test(`orders ${route} rejects unauthenticated, seller, and admin sessions before order actions`, async () => {
    for (const account of [null, seller, admin]) {
      const calls = emptyCalls();
      const response = await makeApp(account, calls).request(`http://localhost/api/checkout${path}`, {
        ...init,
        headers: account ? { ...init.headers, Cookie: "nexamart_session=opaque-session" } : init.headers,
      });
      assert.equal(response.status, account ? 403 : 401);
      assert.deepEqual(calls, emptyCalls());
    }
  });
}

test("customer order routes derive every service identity from the opaque customer session", async () => {
  const calls = emptyCalls();
  const app = makeApp(customer, calls);
  const headers = { Cookie: "nexamart_session=opaque-session" };

  const [list, tracking, checkout] = await Promise.all([
    app.request("http://localhost/api/checkout/orders", { headers }),
    app.request(`http://localhost/api/checkout/orders/${trackingOrderId}/tracking`, { headers }),
    app.request("http://localhost/api/checkout/orders", { method: "POST", headers: { ...headers, "Content-Type": "application/json", "Idempotency-Key": "checkout-1" }, body: JSON.stringify({ customerId: "attacker", shippingAddressId, items: [{ productId, quantity: 1 }] }) }),
  ]);

  assert.equal(list.status, 200);
  assert.equal(tracking.status, 200);
  assert.equal(checkout.status, 201);
  assert.deepEqual(calls, {
    list: [customer.id],
    tracking: [{ customerId: customer.id, orderId: trackingOrderId }],
    checkout: [{ customerId: customer.id, shippingAddressId, items: [{ productId, quantity: 1 }], idempotencyKey: "checkout-1" }],
  });
});
