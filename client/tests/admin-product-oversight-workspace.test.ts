import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("product oversight has an operational header, real catalog tools, and progressive record details", () => {
  assert.match(dashboard, /products: \{ title: "Product oversight", trail: \["Catalog", "Product oversight"\] \}/);
  assert.match(dashboard, /Admin reviews seller-owned products for taxonomy quality, moderation readiness, and publication status\./);

  for (const [label, href] of [
    ["Manage taxonomy", "/admin/taxonomy"],
    ["Create category", "/admin/products/categories/create"],
    ["Create subcategory", "/admin/products/subcategories/create"],
    ["Create brand", "/admin/products/brands/create"],
    ["Seller catalog guidance", "/admin/products/add"],
  ]) assert.match(dashboard, new RegExp(`label: "${label}", description: "[^"]+", href: "${href.replaceAll("/", "\\/")}"`));

  assert.match(dashboard, /<details className="admin-product-details">/);
  assert.match(dashboard, /View catalog details/);
  assert.match(dashboard, /Publication controls/);
  assert.match(dashboard, /Moderation controls/);
  assert.match(dashboard, /Corrective guidance:/);
  assert.doesNotMatch(dashboard, /Not reviewed/);
  assert.match(dashboard, /No products are available for oversight\.<\/strong><p>Seller-submitted products will appear here when catalog review is required\.<\/p>/);

  for (const hook of ["admin-product-workspace", "admin-product-tools", "admin-product-record-identity", "admin-product-actions", "admin-product-details"]) {
    assert.match(styles, new RegExp(hook));
  }
  assert.match(styles, /@media\(max-width:700px\)[\s\S]*admin-product-record/);
});
