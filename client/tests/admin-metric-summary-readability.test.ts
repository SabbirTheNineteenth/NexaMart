import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("admin governance briefing keeps live queue counts readable", () => {
  const start = dashboard.indexOf('className="admin-overview-command-deck"');
  const briefing = dashboard.slice(start, dashboard.indexOf('<section className="admin-grid">', start));
  assert.match(briefing, /<article><span>Seller Review<\/span><strong>\{sellerLoading \? "—" : sellers\.filter\(\(seller\) => seller\.status === "pending"\)\.length\}<\/strong>/);
  assert.match(briefing, /<article><span>Admin Audit<\/span><strong>\{auditLoading \? "—" : auditError \? "!" : data\.auditRecords\.length\}<\/strong>/);
  assert.match(styles, /:global\(\.admin-overview-command-deck\) :global\(article\)\{[^}]*display:grid;[^}]*gap:/);
});
