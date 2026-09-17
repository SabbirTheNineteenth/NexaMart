import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerFinanceRoutes } from "../src/modules/seller/seller-finance.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("seller finance route derives the ledger owner from the session", async () => {
  let requestedSellerId = "";
  const routes = createSellerFinanceRoutes({
    sessions: { async resolve() { return seller; } },
    finance: { async summary(sellerId: string) { requestedSellerId = sellerId; return { summary: { accruedNetAmount: "90.00", eligibleNetAmount: "0.00", paidNetAmount: "0.00", pendingPayoutAmount: "0.00" }, commissions: [], payouts: [] }; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/finance", routes);
  const response = await app.request("http://localhost/api/seller/finance", { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 200);
  assert.equal(requestedSellerId, seller.id);
  assert.equal((await response.json()).summary.accruedNetAmount, "90.00");
});

test("seller payout requests derive ownership from the session and require a positive amount", async () => {
  let input: unknown;
  const routes = createSellerFinanceRoutes({
    sessions: { async resolve() { return seller; } },
    finance: {
      async summary() { return {}; },
      async requestPayout(value: unknown) { input = value; return { id: "payout-1", status: "pending" }; },
    },
  });
  const app = new Hono().basePath("/api"); app.route("/seller/finance", routes);
  const headers = { Cookie: "nexamart_session=valid-token", "Content-Type": "application/json" };
  assert.equal((await app.request("http://localhost/api/seller/finance/payout-requests", { method: "POST", headers, body: JSON.stringify({ amount: "0" }) })).status, 400);
  const response = await app.request("http://localhost/api/seller/finance/payout-requests", { method: "POST", headers, body: JSON.stringify({ amount: "72.00" }) });
  assert.equal(response.status, 201);
  assert.deepEqual(input, { sellerId: seller.id, amount: "72.00" });
});

test("seller finance route rejects customers", async () => {
  const routes = createSellerFinanceRoutes({
    sessions: { async resolve() { return { ...seller, role: "customer" as const }; } },
    finance: { async summary() { throw new Error("not used"); } },
  });
  const app = new Hono().basePath("/api"); app.route("/seller/finance", routes);
  assert.equal((await app.request("http://localhost/api/seller/finance", { headers: { Cookie: "nexamart_session=valid-token" } })).status, 403);
});

test("seller finance returns a safe operation-specific 500 when summary lookup fails", async () => {
  const routes = createSellerFinanceRoutes({
    sessions: { async resolve() { return seller; } },
    finance: { async summary() { throw new Error('database timeout for postgres at 10.0.0.5'); } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/finance", routes);

  const response = await app.request("http://localhost/api/seller/finance", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to load seller finance summary" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});
