import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const legacyComponent = readFileSync(new URL("../src/features/admin/AdminCategoryManagement.tsx", import.meta.url), "utf8");

test("legacy category component no longer carries a legacy category API implementation", () => {
  assert.match(legacyComponent, /AdminTaxonomyManagement as AdminCategoryManagement/);
  assert.doesNotMatch(legacyComponent, /\/admin\/categories|deleteJSON/i);
});
