import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const account = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("C10 keeps account resolution truthful and recoverable", () => {
  assert.match(account, /type AccountResolutionState =/);
  assert.match(account, /reason instanceof ApiError && reason\.status === 401/);
  assert.match(account, /state: "signed-out"/);
  assert.match(account, /state: "error", message:/);
  assert.match(account, /Unable to load your account\./);
  assert.match(account, /Retry loading your account/);
  assert.doesNotMatch(account, /catch \{\s*if \(active\) setAccount\(null\);/);
});

test("C10 gives signed-out, loading, and empty account states the route-local Orchid frame", () => {
  assert.match(account, /import styles from "\.\/AccountWorkspace\.module\.css"/);
  assert.match(account, /className=\{`account-shell customer-account-workspace \$\{styles\.shell\}`\}/);
  assert.match(account, /Checking your account/);
  assert.match(account, /Sign in to your account/);
  assert.match(account, /Your order history is clear\. The collection is waiting\./);
  assert.match(account, /Save pieces from the collection to revisit them here\./);
});
