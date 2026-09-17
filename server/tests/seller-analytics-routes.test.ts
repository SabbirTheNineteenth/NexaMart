import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerAnalyticsRoutes } from "../src/modules/seller/seller-analytics.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };

// This is the repository-shaped persisted result. The HTTP route owns the public
// analytics contract and must map these names before the client receives them.
const persistedAnalytics = {
  bounds: { catalog: "current" as const, orders: "all_time" as const },
  catalog: { productCount: 3, publishedProductCount: 2, draftProductCount: 1, totalStock: 14, outOfStockProductCount: 1 },
  orders: {
    orderLineCount: 4,
    unitsSold: 7,
    grossSalesAmount: "1234.50",
    fulfillment: { pending: 1, processing: 1, packed: 2, shipped: 1, delivered: 1, cancelled: 0, returned: 0 },
  },
};

const clientAnalytics = {
  catalog: { scope: "current", total: 3, published: 2, draft: 1, stock: 14, outOfStock: 1 },
  orders: {
    scope: "all_time",
    orderLineCount: 4,
    unitsSold: 7,
    grossSales: "1234.50",
    fulfillmentStatusCounts: { pending: 1, processing: 1, packed: 2, shipped: 1, delivered: 1, cancelled: 0, returned: 0 },
  },
};

test("seller analytics maps persisted seller-scoped metrics to the explicit client contract", async () => {
  let receivedSellerId: string | undefined;
  const routes = createSellerAnalyticsRoutes({
    sessions: { async resolve() { return seller; } },
    analytics: { async overview(sellerId) { receivedSellerId = sellerId; return persistedAnalytics; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/analytics?sellerId=attacker", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 200);
  assert.equal(receivedSellerId, seller.id);
  assert.deepEqual(await response.json(), { analytics: clientAnalytics });
});

test("seller analytics preserves zero-valued metrics in the client contract", async () => {
  const routes = createSellerAnalyticsRoutes({
    sessions: { async resolve() { return seller; } },
    analytics: { async overview() { return { ...persistedAnalytics, catalog: { productCount: 0, publishedProductCount: 0, draftProductCount: 0, totalStock: 0, outOfStockProductCount: 0 }, orders: { orderLineCount: 0, unitsSold: 0, grossSalesAmount: "0.00", fulfillment: { pending: 0, processing: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 } } }; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/analytics", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.deepEqual(await response.json(), { analytics: { catalog: { scope: "current", total: 0, published: 0, draft: 0, stock: 0, outOfStock: 0 }, orders: { scope: "all_time", orderLineCount: 0, unitsSold: 0, grossSales: "0.00", fulfillmentStatusCounts: { pending: 0, processing: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0, returned: 0 } } } });
});

test("seller analytics rejects non-seller accounts", async () => {
  let called = false;
  const routes = createSellerAnalyticsRoutes({
    sessions: { async resolve() { return customer; } },
    analytics: { async overview() { called = true; return persistedAnalytics; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/analytics", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("seller analytics returns a safe operation-specific 500 when metrics lookup fails", async () => {
  const routes = createSellerAnalyticsRoutes({
    sessions: { async resolve() { return seller; } },
    analytics: { async overview() { throw new Error("database connection refused at 10.0.0.5"); } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/analytics", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to load seller analytics" });
  assert.equal(body.error.includes("10.0.0.5"), false);
});
