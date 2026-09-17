import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const gatePath = new URL("../src/components/RoleProtectedWorkspace.tsx", import.meta.url);
const sellerRoute = new URL("../src/app/seller/page.tsx", import.meta.url);
const sellerSectionRoute = new URL("../src/app/seller/[section]/page.tsx", import.meta.url);
const adminRoute = new URL("../src/app/admin/page.tsx", import.meta.url);
const adminSectionRoute = new URL("../src/app/admin/[section]/page.tsx", import.meta.url);
const adminProductChildRoutes = [
  new URL("../src/app/admin/products/add/page.tsx", import.meta.url),
  new URL("../src/app/admin/products/brands/create/page.tsx", import.meta.url),
  new URL("../src/app/admin/products/categories/create/page.tsx", import.meta.url),
  new URL("../src/app/admin/products/subcategories/create/page.tsx", import.meta.url),
];

test("AUTH-01 protects seller and admin workspace routes through one API-authoritative role gate", () => {
  assert.equal(existsSync(gatePath), true, "the shared protected workspace gate should exist");
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /getJSON<\{ account: Account \}>\("\/auth\/me"/);
  assert.match(gate, /router\.replace\(`\/login\/\$\{role\}`\)/);
  assert.match(gate, /account\.role !== role/);
  assert.match(gate, /This workspace requires a \{role\} account\./);
  assert.match(gate, /response\.status === 401 \|\| response\.status === 403/);
  assert.match(gate, /recoverSession\(response\.status\)/);
});

test("AUTH-LINT-01 defers initial API-authoritative session resolution outside the effect body", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /const initialResolution = window\.setTimeout\(\(\) => \{\s*void recoverSession\(401\);\s*\}, 0\);/);
  assert.match(gate, /return \(\) => \{\s*window\.clearTimeout\(initialResolution\);\s*\};/);
});

test("AUTH-01 applies the shared gate to root and section seller/admin workspaces", () => {
  for (const route of [sellerRoute, sellerSectionRoute]) {
    assert.match(readFileSync(route, "utf8"), /<RoleProtectedWorkspace role="seller">/);
  }
  for (const route of [adminRoute, adminSectionRoute]) {
    assert.match(readFileSync(route, "utf8"), /<RoleProtectedWorkspace role="admin">/);
  }
  for (const route of adminProductChildRoutes) {
    assert.match(readFileSync(route, "utf8"), /<RoleProtectedWorkspace role="admin">/);
  }
});
