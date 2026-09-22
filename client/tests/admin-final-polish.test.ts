import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("final Admin overview exposes only real governance next actions and truthful empty states", () => {
  assert.match(dashboard, /admin-overview-quick-actions/);
  for (const action of [
    ["Add product", "/admin/products/add"],
    ["Create category", "/admin/products/categories/create"],
    ["Create subcategory", "/admin/products/subcategories/create"],
    ["Create brand", "/admin/products/brands/create"],
    ["Review seller applications", "/admin/applications"],
    ["Manage taxonomy", "/admin/taxonomy"],
  ]) assert.match(dashboard, new RegExp(`label: "${action[0]}", href: "${action[1].replaceAll("/", "\\/")}"`));
  for (const state of ["No items require review.", "No live activity available.", "Awaiting real API data."]) assert.match(dashboard, new RegExp(state.replaceAll(".", "\\.")));
  assert.doesNotMatch(dashboard, /GMV|Revenue|Conversion trend|Live seller count/);
});

test("taxonomy create routes have distinct truthful inspector contracts", () => {
  assert.match(taxonomy, /const taxonomyCreateDetails/);
  for (const detail of ["Category identity", "Subcategory hierarchy", "Brand identity"]) assert.match(taxonomy, new RegExp(`title: "${detail}"`));
  assert.match(taxonomy, /admin-taxonomy-create-context/);
  assert.match(taxonomy, /data-admin-taxonomy-kind=\{createKind\}/);
  assert.match(taxonomy, /Parent category/);
  assert.match(styles, /admin-overview-quick-actions/);
  assert.match(styles, /admin-taxonomy-create-page/);
  assert.match(styles, /@media\(max-width:420px\)/);
});
