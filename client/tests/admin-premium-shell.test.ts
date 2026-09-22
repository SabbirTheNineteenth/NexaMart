import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("premium admin shell keeps product child pages discoverable from product oversight tools", () => {
  assert.match(dashboard, /<BrandLogo monogram className="admin-brand-logo"/);
  assert.match(dashboard, /className="admin-product-tools-grid"/);
  for (const route of ["/admin/products/brands/create", "/admin/products/categories/create", "/admin/products/subcategories/create", "/admin/products/add"]) {
    assert.match(dashboard, new RegExp(`href: "${route}"`));
  }
  assert.match(dashboard, /adminProductOversightTools/);
  assert.match(styles, /\.admin-product-tools-grid/);
  assert.match(styles, /\.admin-sidebar-profile/);
  assert.match(styles, /\.admin-utility-bar/);
});
