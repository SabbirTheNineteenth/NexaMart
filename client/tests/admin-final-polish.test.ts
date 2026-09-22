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

test("Admin pale workspaces explicitly keep headers, forms, and action rows readable", () => {
  assert.match(dashboard, /admin-create-breadcrumb/);
  assert.match(dashboard, /Admin\s*\/\s*Catalog/);
  for (const token of ["admin-content-text", "admin-content-muted", "admin-content-placeholder"]) assert.match(styles, new RegExp(`--${token}:`));
  assert.match(styles, /admin-taxonomy-create-page\) :global\(\.admin-panel-head h2\)\{color:var\(--admin-content-text\)/);
  assert.match(styles, /admin-taxonomy-create-page\) :global\(\.admin-taxonomy-fields label\)\{color:var\(--admin-content-muted\)/);
  assert.match(styles, /admin-taxonomy-create-page\) :global\(\.admin-context-link\)\{[^}]*min-height:40px/);
  assert.match(styles, /admin-panel input::placeholder/);
  assert.doesNotMatch(styles, /admin-taxonomy-create-page[^\n]*opacity:\.(?:[0-3])/);
});
