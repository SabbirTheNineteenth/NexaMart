import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("summary cards wait for their own operational feeds before asserting zero risk", () => {
  const summaryStart = dashboard.indexOf('<section className="admin-metrics" aria-label="Marketplace summary">');
  const summary = dashboard.slice(summaryStart, dashboard.indexOf('<section className="admin-grid">', summaryStart));

  assert.match(summary, /<article><span>Product reviews<\/span><strong>\{reviewLoading \? "—" : reviewLoadError \? "!" : data\.reviews\.length\}<\/strong><small>\{reviewLoading \? "Loading review queue" : reviewLoadError \? "Reviews unavailable" : "customer feedback records"\}<\/small><\/article>/);
  assert.match(summary, /<article><span>Catalog risks<\/span><strong>\{productLoading \? "—" : productError \? "!" : attentionProducts\.length\}<\/strong><small>\{productLoading \? "Loading catalog" : productError \? "Catalog unavailable" : "draft or unavailable products"\}<\/small><\/article>/);
  assert.match(summary, /<article><span>Open orders<\/span><strong>\{orderLoading \? "—" : orderError \? "!" : overview\.pendingOrders\}<\/strong><small>\{orderLoading \? "Loading orders" : orderError \? "Orders unavailable" : "awaiting confirmation"\}<\/small><\/article>/);
  assert.match(dashboard, /productLoading \|\| orderLoading \? "Loading current signals…" : productError \|\| orderError \? "Current catalog or order signals are unavailable\."/);
});
