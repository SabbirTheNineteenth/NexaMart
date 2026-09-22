import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");

test("products workspace exposes dedicated canonical creation destinations", () => {
  for (const destination of ["brands/create", "categories/create", "subcategories/create", "add"]) {
    assert.equal(existsSync(new URL(`../src/app/admin/products/${destination}/page.tsx`, import.meta.url)), true);
  }
  assert.match(dashboard, /section: "products"/);
  assert.match(dashboard, /label: "Product Moderation"/);
  assert.match(taxonomy, /createKind\?: AdminTaxonomyKind/);
  assert.match(taxonomy, /Create canonical \{createKind\}/);
});
