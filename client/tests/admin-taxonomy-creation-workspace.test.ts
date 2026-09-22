import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("taxonomy creation is a purposeful stacked workspace without changing canonical form contracts", () => {
  assert.match(taxonomy, /Catalog vocabulary/);
  assert.match(taxonomy, /Create taxonomy records/);
  assert.match(taxonomy, /Add approved categories, subcategories, and brands for seller catalog classification\./);
  assert.match(taxonomy, /Create only canonical terms that should be available in future seller workflows\./);

  for (const guidance of [
    "Create a top-level catalog department.",
    "Place a more specific term under an existing category.",
    "Add an approved manufacturer or marketplace brand.",
  ]) assert.match(taxonomy, new RegExp(guidance.replaceAll(".", "\\.")));

  assert.match(taxonomy, /createForm\("category"\)\}\{createForm\("subcategory"\)\}\{createForm\("brand"\)/);
  assert.match(taxonomy, /<label[^>]*>Parent category<select required name="categoryId"/);
  assert.match(taxonomy, /postJSON<\{ node: AdminTaxonomyNode \}>\(`\/admin\/taxonomy\/\$\{plural\}`, payload\)/);
  assert.match(taxonomy, /name="name"/);
  assert.match(taxonomy, /name="slug"/);
  assert.match(taxonomy, /disabled=\{isPending\}/);

  assert.match(styles, /admin-taxonomy-create-stack/);
  assert.match(styles, /admin-taxonomy-create-card/);
  assert.match(styles, /admin-taxonomy-create-card \.admin-taxonomy-fields/);
  assert.doesNotMatch(styles, /admin-taxonomy-create-grid\)\{display:grid;grid-template-columns:repeat\(3/);
  assert.match(styles, /@media\(max-width:700px\)[\s\S]*admin-taxonomy-create-stack/);
});
