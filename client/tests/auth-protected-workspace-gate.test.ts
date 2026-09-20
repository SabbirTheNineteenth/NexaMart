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

test("AUTH-02 keeps the generic workspace unavailable until the current session is verified", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /role="status" aria-live="polite">Checking protected workspace access…/);
  assert.match(gate, /aria-busy="true"/);
  assert.match(gate, /if \(state\.kind === "ready"\) return <>{children}<\/>;/);
});

test("AUTH-03 gives an unresolved session a truthful retryable recovery instead of treating it as signed out", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /\| \{ kind: "session-error" \}/);
  assert.match(gate, /setState\(\{ kind: "session-error" \}\);/);
  assert.match(gate, /We couldn’t verify your signed-in session\./);
  assert.match(gate, /Try checking access again/);
  assert.doesNotMatch(gate, /Your session is no longer available/);
});

test("AUTH-04 redirects only a confirmed signed-out session to the requested role sign-in", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /reason instanceof ApiError && reason\.status === 401/);
  assert.match(gate, /router\.replace\(`\/login\/\$\{role\}`\);/);
});

test("AUTH-05 makes wrong-role recovery announced and moves focus to its heading", () => {
  const gate = readFileSync(gatePath, "utf8");

  assert.match(gate, /const recoveryHeadingRef = useRef<HTMLHeadingElement>\(null\);/);
  assert.match(gate, /if \(state\.kind !== "wrong-role"\) return;/);
  assert.match(gate, /recoveryHeadingRef\.current\?\.focus\(\);/);
  assert.match(gate, /role="alert" aria-labelledby="workspace-role-heading"/);
  assert.match(gate, /ref=\{recoveryHeadingRef\} tabIndex=\{-1\}/);
  assert.match(gate, /Sign in with a \{roleLabel\(role\)\} account/);
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
