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

test("account workspace preserves truthful feed states in an accessible, compact panel system", () => {
  assert.match(workspace, /className=\{styles\.workspaceHero\}/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /role="alert"/);
  assert.match(workspace, /ordersState\.state === "loaded" \? ordersState\.items\.length/);
  assert.match(styles, /\.workspaceHero\{/);
  assert.match(styles, /min-height:44px/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});
