import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("the shared Admin shell owns responsive navigation and every catalog form surface", () => {
  assert.match(dashboard, /aria-label="Administration sections"/);
  assert.match(dashboard, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.doesNotMatch(taxonomy, /function TaxonomyStyles/);
  assert.match(styles, /admin-taxonomy-workspace/);
  assert.match(styles, /@media\(max-width:900px\)[\s\S]*admin-products-subnav\)\{position:static/);
});

test("the Admin parity layer retains bounded scroll regions, visible focus, and reduced motion", () => {
  assert.match(styles, /admin-operations-table/);
  assert.match(styles, /overscroll-behavior-inline:contain/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /@media\(max-width:390px\)/);
});
