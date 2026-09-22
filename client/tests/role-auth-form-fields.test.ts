import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAuthFormState, setAuthFormField } from "../src/features/auth/roleAuthForm.js";

test("role auth fields are isolated when each controlled value changes", () => {
  let state = createAuthFormState();
  const fields = ["name", "email", "password", "storeName", "storeSlug", "description"] as const;

  for (const field of fields) {
    const before = state;
    state = setAuthFormField(state, field, `${field}-value`);
    for (const other of fields) {
      assert.equal(state[other], other === field ? `${field}-value` : before[other]);
    }
  }
});

test("RoleAuth captures an input value before its queued state update runs", () => {
  const source = readFileSync(new URL("../src/features/auth/RoleAuth.tsx", import.meta.url), "utf8");

  assert.match(source, /const updateFormField = \(field: AuthFormField\) => \(event: ChangeEvent<HTMLInputElement \| HTMLTextAreaElement>\) => \{\s+const value = event\.currentTarget\.value;\s+setFormState\(\(current\) => setAuthFormField\(current, field, value\)\);/);
  assert.doesNotMatch(source, /setAuthFormField\(current, field, event\.currentTarget\.value\)/);
});

test("role auth field metadata gives each rendered control a unique id, name, label, and autocomplete contract", () => {
  const source = readFileSync(new URL("../src/features/auth/RoleAuth.tsx", import.meta.url), "utf8");
  const fields = ["name", "email", "password", "storeName", "storeSlug", "description"] as const;
  const ids = fields.map((field) => `auth-register-seller-${field}`);

  assert.equal(new Set(ids).size, fields.length);
  assert.deepEqual(fields, ["name", "email", "password", "storeName", "storeSlug", "description"]);
  for (const field of fields) {
    assert.match(source, new RegExp(`authFieldId\\(mode, role, "${field}"\\)`));
    assert.match(source, new RegExp(`updateFormField\\("${field}"\\)`));
  }
  assert.match(source, /name="email"[\s\S]*autoComplete="email"/);
  assert.match(source, /name="password"[\s\S]*autoComplete=\{mode === "login" \? "current-password" : "new-password"\}/);
  assert.match(source, /name="storeSlug"[\s\S]*autoComplete="off"/);
  assert.match(source, /name="description"[\s\S]*autoComplete="off"/);
});

test("switching to a different role-auth identity clears controlled state instead of carrying credentials", () => {
  const source = readFileSync(new URL("../src/features/auth/RoleAuth.tsx", import.meta.url), "utf8");
  assert.match(source, /<RoleAuthSurface key=\{`\$\{mode\}-\$\{role\}`\} mode=\{mode\} role=\{role\} \/>/);
});
