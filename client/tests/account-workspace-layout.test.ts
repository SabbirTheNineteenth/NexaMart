import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("account workspace gives each real account area a responsive panel and meaningful status treatment", () => {
  assert.match(workspace, /className=\{styles\.overview\}/);
  assert.match(workspace, /styles\.sectionPanel/);
  assert.match(workspace, /styles\.feedback/);
  assert.match(styles, /\.sectionPanel\{/);
  assert.match(styles, /\.sectionPanel:focus-within\{/);
  assert.match(styles, /\.feedback\{/);
  assert.match(styles, /@media\(max-width:420px\)/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
});
