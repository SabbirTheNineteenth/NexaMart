import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin marketplace summary keeps live operational metrics readable", () => {
  const summaryStart = dashboard.indexOf('<section className="admin-metrics" aria-label="Marketplace summary">');
  const summary = dashboard.slice(summaryStart, dashboard.indexOf('<section className="admin-grid">', summaryStart));

  assert.match(summary, /<article><span>Seller applications<\/span><strong>\{sellerLoading \? "—" : sellers\.filter\(\(seller\) => seller\.status === "pending"\)\.length\}<\/strong><small>\{sellerLoading \? "Loading applications" : "awaiting moderation"\}<\/small><\/article>/);
  assert.match(summary, /<article><span>Open orders<\/span><strong>\{orderLoading \? "—" : orderError \? "!" : overview\.pendingOrders\}<\/strong><small>\{orderLoading \? "Loading orders" : orderError \? "Orders unavailable" : "awaiting confirmation"\}<\/small><\/article>/);
  assert.match(styles, /\.admin-metrics article\{[^}]*display:grid;[^}]*gap:/);
});
