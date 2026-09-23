import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("signed-out account entry keeps its real routes in a compact, readable Account workspace", () => {
  const signedOutBranch = workspace.match(/if \(accountResolution\.state === "signed-out"\)[\s\S]*?(?=  if \(!account\))/)?.[0] ?? "";

  assert.match(signedOutBranch, /styles\.signedOutHeader/);
  assert.match(signedOutBranch, /styles\.signedOutEntry/);
  assert.match(signedOutBranch, /href="\/">Continue browsing/);
  assert.match(signedOutBranch, /href="\/login">Sign in/);
  assert.match(signedOutBranch, /href="\/register">Create an account/);
  assert.match(signedOutBranch, /Access your orders, saved items, shipping addresses, and eligible purchase reviews\./);
  assert.match(signedOutBranch, /New to NexaMart\? Create an account to keep your purchases and delivery details in one place\./);
  assert.doesNotMatch(signedOutBranch, /seller-topbar/);
  assert.match(styles, /\.signedOutHeader\s*\{[\s\S]*?max-width:/);
  assert.match(styles, /\.signedOutEntry\s*\{[\s\S]*?max-width:/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.signedOutActions/);
  assert.match(styles, /\.signedOutHeader :global\(\.marketplace-brand:focus-visible\)/);
});
