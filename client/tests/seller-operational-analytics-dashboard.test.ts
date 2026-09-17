import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

// Matches the public /seller/analytics HTTP response, not repository field names.
const serverAnalyticsResponse = {
  analytics: {
    catalog: { scope: "current", total: 3, published: 2, draft: 1, stock: 14, outOfStock: 1 },
    orders: {
      scope: "all_time",
      orderLineCount: 4,
      unitsSold: 7,
      grossSales: "1234.50",
      fulfillmentStatusCounts: { pending: 1, processing: 1, shipped: 1, delivered: 1, cancelled: 0, returned: 0 },
    },
  },
};

test("seller dashboard renders every value in the server analytics contract instead of its empty state", () => {
  const { analytics } = serverAnalyticsResponse;
  assert.match(dashboard, /getJSON<\{ analytics: SellerAnalytics \}>\("\/seller\/analytics", controller\.signal\)/);
  assert.match(dashboard, /Catalog scope: \{analytics\.catalog\.scope\}/);
  assert.match(dashboard, /Order scope: \{analytics\.orders\.scope\}/);
  for (const field of Object.keys(analytics.catalog)) assert.match(dashboard, new RegExp(`analytics\\.catalog\\.${field}`));
  for (const field of ["orderLineCount", "unitsSold", "grossSales"]) assert.match(dashboard, new RegExp(`analytics\\.orders\\.${field}`));
  for (const status of Object.keys(analytics.orders.fulfillmentStatusCounts)) assert.match(dashboard, new RegExp(`fulfillmentStatusCounts\\[status\\]`));
  assert.match(dashboard, /analytics\.catalog\.total === 0 && analytics\.orders\.orderLineCount === 0/);
  assert.match(sellerTypes, /export type SellerAnalytics =/);
  assert.match(sellerTypes, /scope: "current";/);
  assert.match(sellerTypes, /scope: "all_time";/);
  assert.match(sellerTypes, /grossSales: string;/);
  assert.match(sellerTypes, /fulfillmentStatusCounts: Record<FulfillmentStatus, number>;/);
});

test("seller finance models review records without representing payout execution", () => {
  assert.match(dashboard, /Accrued net amount/);
  assert.match(dashboard, /Eligible net amount/);
  assert.match(dashboard, /Commission ledger/);
  assert.match(dashboard, /Request history/);
  assert.match(dashboard, /does not execute a payout/);
  assert.match(dashboard, /does not transfer or settle money/);
  assert.match(sellerTypes, /payouts: SellerPayout\[\];/);
  assert.match(sellerTypes, /export type SellerPayout = \{ id: string; reference: string; amount: string; status: "pending" \| "approved" \| "rejected"; createdAt: string \};/);
  assert.doesNotMatch(`${dashboard}\n${sellerTypes}`, /paidNetAmount|pendingPayoutAmount|Payout history|No payout entries|settled/i);
});
