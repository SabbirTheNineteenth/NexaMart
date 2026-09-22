import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("UI-04 orders the persistent control-room navigation around real governance workflows", () => {
  const order = ["overview", "products", "taxonomy", "promotions", "applications", "sellers", "finance", "orders", "feedback", "analytics", "audit", "accounts"];
  const navOrder = dashboard.match(/const adminNavigationGroups: AdminNavigationGroup\[\] = \[([\s\S]+?)\n\];/)?.[1] ?? "";
  let cursor = -1;
  for (const section of order) {
    const next = navOrder.indexOf(`\"${section}\"`);
    assert.ok(next > cursor, `${section} follows the prior control-room workflow`);
    cursor = next;
  }
  assert.match(dashboard, /label: "Seller Review"/);
  assert.match(dashboard, /label: "Admin Audit"/);
});

test("UI-04 keeps dense dark surfaces, active orchid navigation, mobile reflow, and reduced motion", () => {
  assert.match(styles, /background:var\(--admin-obsidian\)/);
  assert.match(styles, /background:var\(--admin-plum\)/);
  assert.match(styles, /\.is-active\)\{[\s\S]*var\(--admin-orchid\)/);
  assert.match(styles, /@media\(max-width:900px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(styles, /#c6f135|#faf9ff|#fffef9/);
});
