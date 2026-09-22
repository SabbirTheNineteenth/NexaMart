import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("A02 keeps the compact rail in the real governance workflow order before secondary work", () => {
  assert.match(dashboard, /const adminNavigationGroups: AdminNavigationGroup\[\] = \[/);
  for (const label of ["Workspace", "Catalog", "Seller operations", "Marketplace activity", "Governance"]) assert.match(dashboard, new RegExp(`label: "${label}"`));
  assert.match(dashboard, /label: "Seller Review"/);
  assert.match(dashboard, /label: "Product Moderation"/);
  assert.match(dashboard, /label: "Payout Review"/);
  assert.match(dashboard, /label: "Admin Audit"/);
  assert.match(styles, /grid-template-columns:216px minmax\(0,1fr\)/);
});

test("A03 keeps every briefing widget tied to an existing loaded queue feed", () => {
  const briefingStart = dashboard.indexOf('className="admin-overview-briefing"');
  const briefingEnd = dashboard.indexOf('<section className="admin-grid">', briefingStart);
  const briefing = dashboard.slice(briefingStart, briefingEnd);

  for (const label of ["Seller Review", "Product Moderation", "Payout Review", "Admin Audit"]) assert.match(briefing, new RegExp(`<span>${label}<\\/span>`));
  assert.match(briefing, /aria-busy=\{sellerLoading \|\| productLoading \|\| financeLoading \|\| auditLoading\}/);
  assert.match(briefing, /data\.auditRecords\.length/);
  assert.doesNotMatch(briefing, /Taxonomy governance|<strong aria-hidden="true">→<\/strong>/);
});

test("A04 retains the dense API-backed audit preview with its full trace columns", () => {
  const auditStart = dashboard.indexOf('className="admin-panel admin-overview-audit"');
  const auditEnd = dashboard.indexOf('<section className="admin-panel admin-global-search"', auditStart);
  const audit = dashboard.slice(auditStart, auditEnd);

  assert.match(audit, /data\.auditRecords\.slice\(0, 5\)/);
  for (const heading of ["Time", "Admin", "Action", "Details"]) assert.match(audit, new RegExp(`<th scope="col">${heading}<\\/th>`));
  assert.match(styles, /:global\(\.admin-overview-audit-table\)\{[\s\S]*min-width:620px/);
});
