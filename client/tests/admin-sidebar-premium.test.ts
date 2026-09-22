import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("Admin sidebar keeps real navigation inside a compact workspace identity", () => {
  for (const route of ["overview", "applications", "orders", "feedback", "finance", "analytics", "audit", "sellers", "products", "taxonomy", "promotions", "accounts"]) {
    assert.match(dashboard, new RegExp(`section: "${route}"`));
  }
  assert.match(dashboard, /NexaMart Admin/);
  assert.match(dashboard, /Marketplace administration/);
  assert.doesNotMatch(dashboard, /className="admin-sidebar-context"><span>Control room/);
  assert.doesNotMatch(dashboard, /className="admin-sidebar-context">[\s\S]{0,200}Marketplace governance/);
  assert.match(dashboard, /aria-current=\{isActive \? "page" : undefined\}/);
});

test("Admin sidebar has stable footer actions and compact responsive containment", () => {
  assert.match(dashboard, /className="admin-sidebar-logout"/);
  assert.match(dashboard, /className="admin-sidebar-return admin-action-control"/);
  assert.match(styles, /admin-sidebar-premium/);
  assert.match(styles, /scrollbar-width:none/);
  assert.match(styles, /admin-workspace-nav::-webkit-scrollbar/);
  assert.match(styles, /@media\(max-width:900px\)[\s\S]*admin-sidebar-premium/);
  assert.match(styles, /admin-workspace-nav[^\n]*min-height:0/);
});
