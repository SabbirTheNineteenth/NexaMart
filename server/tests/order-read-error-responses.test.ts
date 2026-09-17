import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createOrderRoutes } from "../src/modules/orders/order.routes.js";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const customer = { id: "customer-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { id: "seller-1", name: "Seller", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("customer order list returns a generic 500 response when its read fails", async () => {
  const app = new Hono().basePath("/api");
  app.route("/checkout", createOrderRoutes({
    sessions: { async resolve() { return customer; } },
    orders: {
      async checkout() { throw new Error("not used"); },
      async listForCustomer() { throw new Error("connection terminated for postgres://orders.internal"); },
      async getTrackingForCustomer() { return null; },
    },
  }));

  const response = await app.request("http://localhost/api/checkout/orders", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load orders" });
});

test("customer tracking returns a generic 500 response when its read fails", async () => {
  const app = new Hono().basePath("/api");
  app.route("/checkout", createOrderRoutes({
    sessions: { async resolve() { return customer; } },
    orders: {
      async checkout() { throw new Error("not used"); },
      async listForCustomer() { return []; },
      async getTrackingForCustomer() { throw new Error("password authentication failed for orders-db.internal"); },
    },
  }));

  const orderId = "33333333-3333-4333-8333-333333333333";
  const response = await app.request(`http://localhost/api/checkout/orders/${orderId}/tracking`, { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load order tracking" });
});

test("seller order feed returns a generic 500 response when its read fails", async () => {
  const app = new Hono().basePath("/api");
  app.route("/seller", createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: { async listProducts() { return []; }, async createProduct() { throw new Error("not used"); }, async updateStock() {} } as never,
    orders: { async listForSeller() { throw new Error("database connection refused at 10.0.0.5"); } },
  }));

  const response = await app.request("http://localhost/api/seller/orders", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load seller orders" });
});
