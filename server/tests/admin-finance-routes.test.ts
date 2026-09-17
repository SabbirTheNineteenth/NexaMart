import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createAdminFinanceRoutes } from "../src/modules/admin/admin-finance.routes.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...admin, id: "customer-1", role: "customer" as const };
const overview = {
  summary: {
    grossAmount: "180.00",
    commissionAmount: "18.00",
    netAmount: "162.00",
    accruedNetAmount: "90.00",
    eligibleNetAmount: "72.00",
    paidNetAmount: "0.00",
    pendingPayoutAmount: "72.00",
  },
  commissions: [{ id: "commission-1", sellerId: "seller-1", orderReference: "ORD-100", orderItemId: "item-1", grossAmount: "100.00", ratePercent: "10.00", commissionAmount: "10.00", netAmount: "90.00", status: "accrued", createdAt: "2026-09-11T00:00:00.000Z" }],
  payouts: [{ id: "payout-1", sellerId: "seller-1", reference: "PAY-100", amount: "72.00", status: "pending", createdAt: "2026-09-11T00:00:00.000Z" }],
};

function makeApp(account = admin, finance = { async overview() { return overview; } }) {
  const app = new Hono().basePath("/api");
  app.route("/admin/finance", createAdminFinanceRoutes({ sessions: { async resolve() { return account; } }, finance }));
  return app;
}

test("admin finance overview exposes operational records only to an authenticated admin", async () => {
  const response = await makeApp().request("http://localhost/api/admin/finance", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), overview);
});

test("admin finance overview returns a generic JSON 500 when the financial read fails", async () => {
  const response = await makeApp(admin, { async overview() { throw new Error("postgres://db.internal:5432/finance"); } })
    .request("http://localhost/api/admin/finance", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin finance overview" });
});

test("admin finance overview rejects non-admin accounts", async () => {
  const response = await makeApp(customer).request("http://localhost/api/admin/finance", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("admin finance overview rejects unauthenticated requests", async () => {
  const response = await makeApp().request("http://localhost/api/admin/finance");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("admin payout review is session-derived, guarded, and maps stale state to 409", async () => {
  let input: unknown;
  const finance = {
    async overview() { return overview; },
    async reviewPayout(value: unknown) { input = value; return { id: "payout-1", status: "approved" }; },
  };
  const app = makeApp(admin, finance);
  const response = await app.request("http://localhost/api/admin/finance/payouts/11111111-1111-4111-8111-111111111111/review", { method: "PATCH", headers: { Cookie: "nexamart_session=admin-token", "Content-Type": "application/json" }, body: JSON.stringify({ decision: "approve", expectedStatus: "pending" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(input, { payoutId: "11111111-1111-4111-8111-111111111111", decision: "approve", expectedStatus: "pending", adminId: admin.id });
  const staleApp = makeApp(admin, { async overview() { return overview; }, async reviewPayout() { throw new Error("Payout review is no longer available"); } });
  const stale = await staleApp.request("http://localhost/api/admin/finance/payouts/11111111-1111-4111-8111-111111111111/review", { method: "PATCH", headers: { Cookie: "nexamart_session=admin-token", "Content-Type": "application/json" }, body: JSON.stringify({ decision: "reject", expectedStatus: "pending" }) });
  assert.equal(stale.status, 409);
});

test("application wires the protected admin finance overview", () => {
  const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");

  assert.match(source, /app\.route\("\/admin\/finance", createAdminFinanceRoutes\(\{ sessions: sessionService, finance: adminFinanceService \}\)\)/);
});
