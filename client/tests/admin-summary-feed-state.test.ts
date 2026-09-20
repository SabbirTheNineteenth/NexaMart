import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("briefing cards wait for their own queue feeds before asserting zero", () => {
  const start = dashboard.indexOf('className="admin-overview-command-deck"');
  const briefing = dashboard.slice(start, dashboard.indexOf('<section className="admin-grid">', start));
  assert.match(briefing, /<article><span>Product Moderation<\/span><strong>\{productLoading \? "—" : productError \? "!" : attentionProducts\.length\}<\/strong><small>\{productLoading \? "Loading catalog" : productError \? "Catalog unavailable" : "records needing attention"\}<\/small>/);
  assert.match(briefing, /<article><span>Payout Review<\/span><strong>\{financeLoading \? "—" : financeError \? "!" : finance \? finance\.payouts\.filter\(\(payout\) => payout\.status === "pending"\)\.length : 0\}<\/strong>/);
  assert.match(briefing, /<article><span>Admin Audit<\/span><strong>\{auditLoading \? "—" : auditError \? "!" : data\.auditRecords\.length\}<\/strong>/);
});
