import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accountWorkspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("failed customer logout preserves the signed-in workspace and provides an accessible retry", () => {
  assert.match(accountWorkspace, /type LogoutState = \{ state: "idle" \} \| \{ state: "pending" \} \| \{ state: "error"; message: string \}/);
  assert.match(accountWorkspace, /const \[logoutState, setLogoutState\] = useState<LogoutState>\(\{ state: "idle" \}\);/);
  assert.match(accountWorkspace, /const logout = async \(\) => \{[\s\S]*?setLogoutState\(\{ state: "pending" \}\);[\s\S]*?await postJSON<void>\("\/auth\/logout", \{\}\);[\s\S]*?setAccount\(null\);[\s\S]*?catch \(reason\) \{[\s\S]*?setLogoutState\(\{ state: "error", message:/);
  assert.match(accountWorkspace, /logoutState\.state === "error" && <div role="alert">[\s\S]*?logoutState\.message[\s\S]*?Try signing out again/);
  assert.match(accountWorkspace, /disabled=\{logoutState\.state === "pending"\}[\s\S]*?logoutState\.state === "pending" \? "Signing out…" : "Sign out"/);
});

test("successful customer logout clears authenticated account state", () => {
  assert.match(accountWorkspace, /await postJSON<void>\("\/auth\/logout", \{\}\);[\s\S]*?setAccount\(null\);/);
});
