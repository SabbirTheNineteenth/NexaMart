import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("seller catalog guidance explains the seller-owned lifecycle with only real Admin destinations", () => {
  assert.match(dashboard, /productOperation === "add"/);
  assert.match(dashboard, /Seller-owned catalog/);
  assert.match(dashboard, /Sellers create and submit product listings/);
  assert.match(dashboard, /Admin does not create seller inventory from this workspace/);

  for (const step of [
    "Prepare approved taxonomy",
    "Seller submits a product draft",
    "Admin reviews catalog quality",
    "Publish or request corrections",
  ]) assert.match(dashboard, new RegExp(`title: "${step}"`));

  for (const [label, href] of [
    ["Manage categories", "/admin/products/categories/create"],
    ["Manage subcategories", "/admin/products/subcategories/create"],
    ["Manage brands", "/admin/products/brands/create"],
    ["Open product oversight", "/admin/products"],
  ]) {
    assert.match(dashboard, new RegExp(`label: "${label}", description: "[^"]+", href: "${href.replaceAll("/", "\\/")}"`));
  }

  assert.match(dashboard, /No seller submission requires action from this page\./);
  assert.match(dashboard, /Use Product oversight when seller-submitted catalog records are available for review\./);
  assert.doesNotMatch(dashboard, /Admin product creation|Create inventory|Upload product/);

  for (const hook of ["admin-product-guidance", "admin-guidance-workflow", "admin-guidance-actions", "admin-catalog-ownership"]) {
    assert.match(styles, new RegExp(hook));
  }
  assert.match(styles, /@media\(max-width:420px\)/);
});
