import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("catalog governance routes retain real actions inside the shared operational shell", () => {
  for (const route of ["add", "brands/create", "categories/create", "subcategories/create"]) {
    assert.equal(existsSync(new URL(`../src/app/admin/products/${route}/page.tsx`, import.meta.url)), true);
  }
  assert.match(dashboard, /className="admin-catalog-governance"/);
  assert.match(dashboard, /href="\/admin\/products\/categories\/create"/);
  assert.match(dashboard, /href="\/admin\/products\/subcategories\/create"/);
  assert.match(dashboard, /href="\/admin\/products\/brands\/create"/);
  assert.match(dashboard, /No products are available for oversight\./);
  assert.match(taxonomy, /No pending taxonomy proposals\./);
});

test("catalog records and inspector forms have responsive containment hooks", () => {
  assert.match(dashboard, /className="admin-list admin-governance-table"/);
  assert.match(taxonomy, /admin-category-create admin-inspector-form/);
  assert.match(styles, /admin-catalog-governance/);
  assert.match(styles, /admin-governance-table/);
  assert.match(styles, /admin-inspector-form/);
  assert.match(styles, /@media\(max-width:700px\)[\s\S]*admin-governance-table/);
});
