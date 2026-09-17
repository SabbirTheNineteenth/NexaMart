import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("admin navigation gives every operational panel its own route and a labeled icon", () => {
  assert.equal(existsSync(new URL("../src/app/admin/[section]/page.tsx", import.meta.url)), true);

  assert.match(dashboard, /const adminSections: AdminSectionDefinition\[\] = \[/);
  assert.match(dashboard, /section: "overview"/);
  assert.match(dashboard, /section: "orders"/);
  assert.match(dashboard, /section: "feedback"/);
  assert.match(dashboard, /section: "finance"/);
  assert.match(dashboard, /section: "analytics"/);
  assert.match(dashboard, /section: "audit"/);
  assert.match(dashboard, /section: "sellers"/);
  assert.match(dashboard, /section: "products"/);
  assert.match(dashboard, /section: "taxonomy"/);
  assert.match(dashboard, /section: "promotions"/);
  assert.match(dashboard, /section: "accounts"/);
  assert.match(dashboard, /href=\{`\/admin\/\$\{item\.section\}`\}/);
  assert.match(dashboard, /data-admin-section=\{activeSection\}/);

  assert.match(dashboard, /aria-label=\{item\.label\}/);
  assert.match(dashboard, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(styles, /--admin-obsidian:#15111b/);
  assert.doesNotMatch(styles, /admin-workspace-content > :not\(\.admin-utility-bar\)\{display:none\}/);
  assert.match(dashboard, /activeSection === "orders"/);
  assert.match(styles, /admin-nav-icon/);
});

test("admin dynamic route allowlists only implemented control-room sections and sends unknown sections to notFound", () => {
  const route = readFileSync(new URL("../src/app/admin/[section]/page.tsx", import.meta.url), "utf8");
  for (const section of ["overview", "applications", "orders", "feedback", "finance", "analytics", "audit", "sellers", "products", "taxonomy", "promotions", "accounts"]) {
    assert.match(route, new RegExp(`"${section}"`));
  }
  assert.match(route, /const sections = new Set\(\[/);
  assert.match(route, /if \(!sections\.has\(section\)\) notFound\(\);/);
  assert.match(route, /import \{ notFound \} from "next\/navigation"/);
});
