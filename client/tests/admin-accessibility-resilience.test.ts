import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin keyboard, category, seller, and audit controls have resilient accessible structure", () => {
  assert.match(dashboard, /function focusWorkspace\(event: MouseEvent<HTMLAnchorElement>\)/);
  assert.match(dashboard, /tabIndex=\{-1\}/);
  assert.match(taxonomy, /const taxonomyRequestController = useRef<AbortController \| null>\(null\);/);
  assert.match(taxonomy, /const proposalRequestController = useRef<AbortController \| null>\(null\);/);
  assert.match(taxonomy, /taxonomyRequestController\.current\?\.abort\(\);/);
  assert.match(styles, /\.admin-seller-record\{[^}]*min-width:0/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*\.admin-seller-record\{[^}]*grid-template-columns:1fr/s);
  assert.match(styles, /\.admin-audit-filters\{[^}]*display:grid/);
  assert.match(styles, /\.admin-audit-filters input:focus-visible,\.admin-audit-filters select:focus-visible,\.admin-audit-filters button:focus-visible/);
});
