import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminAnalyticsRoutes } from "../src/modules/admin/admin-analytics.routes.js";

const admin = { id: "admin-1", name: "Ada", email: "ada@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...admin, id: "customer-1", role: "customer" as const };

const analytics = {
  bounds: { accounts: "all_time", sellers: "all_time", catalog: "current", orders: "all_time", reviews: "all_time", commissions: "all_time" },
  accounts: { total: 8, customers: 5, sellers: 2, admins: 1 },
  sellers: { total: 3, pending: 1, approved: 0, rejected: 0, suspended: 0, active: 2 },
  catalog: { categories: 4, products: 10, publishedProducts: 7, draftProducts: 3, totalStock: 42, outOfStockProducts: 2 },
  orders: { orders: 6, grossOrderTotal: "1234.50", orderLines: 9, unitsOrdered: 13, fulfillment: { pending: 2, processing: 1, shipped: 2, delivered: 3, cancelled: 0, returned: 1 } },
  reviews: { total: 5, visible: 4, hidden: 1 },
  commissions: { records: 7, grossAmount: "900.00", commissionAmount: "90.00", netAmount: "810.00", accrued: 2, eligible: 3, paid: 1, void: 1 },
};

function makeApp(account = admin, analyticsReader = { async overview() { return analytics; } }) {
  const routes = createAdminAnalyticsRoutes({
    sessions: { async resolve() { return account; } },
    analytics: analyticsReader,
  });
  const app = new Hono().basePath("/api");
  app.route("/admin/analytics", routes);
  return app;
}

test("admin analytics returns bounded marketplace aggregates to an authenticated admin", async () => {
  const response = await makeApp().request("http://localhost/api/admin/analytics", { headers: { Cookie: "nexamart_session=admin-session" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { analytics });
  assert.equal(typeof analytics.orders.grossOrderTotal, "string");
  assert.equal(typeof analytics.commissions.commissionAmount, "string");
});

test("admin analytics returns a generic JSON 500 when overview aggregation fails", async () => {
  const response = await makeApp(admin, { async overview() { throw new Error("postgres://db.internal:5432/analytics"); } })
    .request("http://localhost/api/admin/analytics", { headers: { Cookie: "nexamart_session=admin-session" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin analytics" });
});

test("admin analytics rejects missing and non-admin sessions", async () => {
  const missing = await makeApp().request("http://localhost/api/admin/analytics");
  const forbidden = await makeApp(customer).request("http://localhost/api/admin/analytics", { headers: { Cookie: "nexamart_session=customer-session" } });
  assert.equal(missing.status, 401);
  assert.equal(forbidden.status, 403);
});
