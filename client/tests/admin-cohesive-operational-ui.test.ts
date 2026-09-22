import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("every Admin route gets contextual shell copy and one readable operational foundation", () => {
  assert.match(dashboard, /const adminRouteContext/);
  for (const label of ["Overview", "Seller review", "Product oversight", "Taxonomy", "Promotion oversight", "Audit trail", "Seller catalog guidance"]) {
    assert.match(dashboard, new RegExp(`title: "${label}"`));
  }
  assert.match(styles, /ADMIN OPERATIONAL FOUNDATION/);
  assert.match(styles, /--admin-canvas:#f4f1f9/);
  assert.match(styles, /--admin-ink:#21183b/);
  assert.match(styles, /\.admin-workspace-content\)\{[^}]*background:var\(--admin-canvas\)/);
  assert.match(styles, /\.admin-panel input\),:global\(\.admin-workspace\) :global\(\.admin-panel select\)/);
  assert.match(styles, /\.admin-empty\)\{[^}]*color:var\(--admin-ink\)/);
  assert.doesNotMatch(styles, /Phase three extends|Final parity pass|Final operational polish/);
});
