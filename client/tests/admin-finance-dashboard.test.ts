import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");

test("admin dashboard loads a guarded payout-review finance oversight panel", () => {
  assert.match(dashboard, /getJSON<AdminFinanceOverview>\("\/admin\/finance", controller\.signal\)/);
  assert.match(dashboard, /<section className="admin-panel admin-finance" aria-labelledby="finance-heading">/);
  assert.match(dashboard, /<h2 id="finance-heading">Finance oversight<\/h2>/);
  assert.match(dashboard, /Review records only\. Approval does not execute, transfer, or settle money\./);
  assert.match(dashboard, /Gross amount/);
  assert.match(dashboard, /Platform commission/);
  assert.match(dashboard, /Net seller amount/);
  assert.match(dashboard, /<h3>Commission records<\/h3>/);
  assert.match(dashboard, /finance\.commissions\.map\(\(commission\)/);
  assert.match(dashboard, /Payout review queue/);
  assert.match(dashboard, /Approve review/);
  assert.match(dashboard, /Reject review/);
  assert.match(dashboard, /expectedStatus: "pending"/);
});

test("admin finance oversight covers loading, failure, and empty record states", () => {
  assert.match(dashboard, /Loading finance records…/);
  assert.match(dashboard, /Unable to load finance records\./);
  assert.match(dashboard, /No commission records yet\./);

});

test("admin finance types preserve server decimal strings and operational records", () => {
  assert.match(adminTypes, /export type AdminFinanceOverview =/);
  assert.match(adminTypes, /grossAmount: string;/);
  assert.match(adminTypes, /commissionAmount: string;/);
  assert.match(adminTypes, /export type AdminFinanceCommission =/);
  assert.match(adminTypes, /sellerId: string;/);
  assert.match(adminTypes, /pendingPayoutAmount: string;/);
  assert.match(adminTypes, /AdminFinancePayout/);
  assert.match(adminTypes, /payouts: AdminFinancePayout\[\]/);
});

test("admin finance oversight has review controls but no execution claim", () => {
  const financePanel = dashboard.slice(dashboard.indexOf('className="admin-panel admin-finance"'));
  assert.match(dashboard, /patchJSON<AdminFinancePayout>/);
  assert.match(financePanel, /does not execute, transfer, or settle money/);
});

test("admin finance and analytics use payment-free metric labels", () => {
  const financeStart = dashboard.indexOf('className="admin-panel admin-finance"');
  const analyticsStart = dashboard.indexOf('className="admin-panel admin-analytics"');
  const financePanel = dashboard.slice(financeStart, analyticsStart);
  const analyticsPanel = dashboard.slice(analyticsStart, dashboard.indexOf("<AdminTaxonomyManagement", analyticsStart));

  assert.doesNotMatch(`${financePanel}\n${analyticsPanel}`, />[^<]*\b(?:Completed|Settled|payable|payout-executable)\b[^<]*</i);
  assert.match(financePanel, /Recorded net/);
  assert.match(analyticsPanel, /Recorded \{recordedCommissionCount\}/);
});

test("admin dashboard loads an accessible read-only marketplace analytics panel with declared bounds", () => {
  assert.match(dashboard, /getJSON<\{ analytics: AdminAnalytics \}>\("\/admin\/analytics", controller\.signal\)/);
  assert.match(dashboard, /<section className="admin-panel admin-analytics" aria-labelledby="analytics-heading">/);
  assert.match(dashboard, /<h2 id="analytics-heading">Marketplace analytics<\/h2>/);
  assert.match(dashboard, /Read-only aggregate records\. Values are bounded as labeled\./);
  assert.match(dashboard, /Accounts: \{analytics\.bounds\.accounts\}/);
  assert.match(dashboard, /Sellers: \{analytics\.bounds\.sellers\}/);
  assert.match(dashboard, /Catalog: \{analytics\.bounds\.catalog\}/);
  assert.match(dashboard, /Orders: \{analytics\.bounds\.orders\}/);
  assert.match(dashboard, /Reviews: \{analytics\.bounds\.reviews\}/);
  assert.match(dashboard, /Commissions: \{analytics\.bounds\.commissions\}/);
  assert.match(dashboard, /analytics\.accounts\.total/);
  assert.match(dashboard, /analytics\.sellers\.active/);
  assert.match(dashboard, /analytics\.catalog\.totalStock/);
  assert.match(dashboard, /analytics\.orders\.grossOrderTotal/);
  assert.match(dashboard, /fulfillmentStatuses\.map/);
  assert.match(dashboard, /analytics\.reviews\.visible/);
  assert.match(dashboard, /analytics\.commissions\.commissionAmount/);
});

test("admin marketplace analytics isolates loading, error, and zero aggregate states", () => {
  assert.match(dashboard, /Loading marketplace analytics…/);
  assert.match(dashboard, /Unable to load marketplace analytics\./);
  assert.match(dashboard, /aria-label="Retry marketplace analytics"/);
  assert.match(dashboard, /Marketplace analytics are unavailable\./);
  assert.match(dashboard, /No marketplace activity is recorded within these bounds\./);
});

test("admin marketplace analytics types retain precise decimal totals and bounded status aggregates", () => {
  assert.match(adminTypes, /export type AdminAnalytics =/);
  assert.match(adminTypes, /accounts: "all_time";/);
  assert.match(adminTypes, /catalog: "current";/);
  assert.match(adminTypes, /grossOrderTotal: string;/);
  assert.match(adminTypes, /commissionAmount: string;/);
  assert.match(adminTypes, /fulfillment: Record<FulfillmentStatus, number>/);
});

test("admin marketplace analytics makes no chart, trend, payment, or delivery claims", () => {
  const analyticsStart = dashboard.indexOf('className="admin-panel admin-analytics"');
  const analyticsPanel = dashboard.slice(analyticsStart, dashboard.indexOf("<AdminTaxonomyManagement", analyticsStart));
  assert.doesNotMatch(analyticsPanel, /chart|trend|payment|delivery/i);
  assert.match(analyticsPanel, /<button type="button" onClick=\{loadAnalytics\} disabled=\{analyticsLoading\} aria-label="Retry marketplace analytics">Try again<\/button>/);
});
