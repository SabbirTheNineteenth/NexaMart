import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("remaining Admin routes retain their real workflows in the operations workspace", () => {
  for (const section of ["applications", "sellers", "orders", "feedback", "finance", "analytics", "audit", "promotions", "accounts"]) {
    assert.match(dashboard, new RegExp(`activeSection === "${section}"`));
  }
  assert.match(dashboard, /className="admin-operations-workspace"><section className="admin-panel admin-seller-moderation"/);
  assert.match(dashboard, /className="admin-operations-workspace"><section className="admin-panel admin-order-oversight"/);
  assert.match(dashboard, /className="admin-operations-workspace"><section className="admin-panel admin-audit" aria-labelledby="audit-heading">/);
  assert.match(dashboard, /No seller applications are available for moderation\./);
  assert.match(dashboard, /No orders are available for oversight\./);
  assert.match(dashboard, /No promotion configurations are available for oversight\./);
});

test("operations records have shared responsive containment and visible control hooks", () => {
  assert.match(styles, /admin-operations-workspace/);
  assert.match(styles, /admin-operations-table/);
  assert.match(styles, /admin-operations-empty/);
  assert.match(styles, /@media\(max-width:700px\)[\s\S]*admin-operations-table/);
  assert.match(styles, /@media\(max-width:420px\)[\s\S]*admin-operations-workspace/);
});
