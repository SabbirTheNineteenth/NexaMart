import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("customer header keeps the real brand, browsing, and logout actions in one contained navigation bar", () => {
  assert.match(workspace, /styles\.accountHeader/);
  assert.match(workspace, /styles\.headerActions/);
  assert.match(workspace, /href="\/">Continue browsing/);
  assert.match(workspace, /onClick=\{\(\) => void logout\(\)\}/);
  assert.match(styles, /\.accountHeader\s*\{[\s\S]*?max-width:/);
  assert.match(styles, /\.headerActions[\s\S]*?gap:/);
  assert.match(styles, /\.headerActions :global\(\.account-switch\)[\s\S]*?min-height: 40px/);
  assert.match(styles, /\.accountHeader :global\(\.marketplace-brand:focus-visible\)/);
});
