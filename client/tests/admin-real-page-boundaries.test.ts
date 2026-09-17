import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("admin sections render only their own operational workspace instead of CSS-hiding a monolithic page", () => {
  for (const section of ["overview", "sellers", "products", "orders", "feedback", "finance", "analytics", "audit", "taxonomy", "promotions", "accounts"]) {
    assert.match(dashboard, new RegExp(`activeSection === "${section}"`));
  }
  assert.doesNotMatch(styles, /admin-workspace-content > :not\(\.admin-utility-bar\)\{display:none\}/);
});

test("products has dedicated canonical category, subcategory, and brand child routes", () => {
  for (const href of ["/admin/products/brands/create", "/admin/products/categories/create", "/admin/products/subcategories/create", "/admin/products/add"]) {
    assert.match(dashboard, new RegExp(href.replaceAll("/", "\\/")));
  }
});
