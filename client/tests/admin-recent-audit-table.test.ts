import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");
test("Admin overview presents API-backed recent audit activity as a dense, narrow-safe table", () => {
  const auditStart = dashboard.indexOf('className="admin-panel admin-overview-audit"');
  const auditEnd = dashboard.indexOf('<section className="admin-panel admin-global-search"', auditStart);
  const audit = dashboard.slice(auditStart, auditEnd);
  assert.match(audit, /<h2 id="overview-audit-heading">Recent Admin Audit<\/h2>/);
  assert.match(audit, /<table className="admin-overview-audit-table">/);
  for (const heading of ["Time", "Admin", "Action", "Details"]) assert.match(audit, new RegExp(`<th scope="col">${heading}<\\/th>`));
  assert.match(audit, /<td>\{record\.actorId\}<\/td>/);
  assert.match(audit, /<td><code>\{auditMetadataText\(record\.metadata\)\}<\/code><\/td>/);
  assert.match(styles, /:global\(\.admin-overview-audit-table\)\{[\s\S]*width:100%/);
});
