import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller logout uses the shared authenticated contract with pending and recovery states", () => {
  assert.match(dashboard, /type LogoutState = \{ state: "idle" \} \| \{ state: "pending" \} \| \{ state: "error"; message: string \}/);
  assert.match(dashboard, /const \[logoutState, setLogoutState\] = useState<LogoutState>\(\{ state: "idle" \}\);/);
  assert.match(dashboard, /const logout = async \(\) => \{[\s\S]*?setLogoutState\(\{ state: "pending" \}\);[\s\S]*?await postJSON<void>\("\/auth\/logout", \{\}\);[\s\S]*?window\.location\.assign\("\/"\);[\s\S]*?catch \(reason\) \{[\s\S]*?setLogoutState\(\{ state: "error", message:/);
  assert.match(dashboard, /disabled=\{logoutState\.state === "pending"\}[\s\S]*?logoutState\.state === "pending" \? "Signing out…" : "Sign out"/);
  assert.match(dashboard, /logoutState\.state === "error" && <div className=\{styles\.logoutRecovery\} role="alert">[\s\S]*?logoutState\.message[\s\S]*?Try signing out again/);
  assert.match(styles, /\.logoutRecovery\s*\{[^}]*border:\s*1px solid #dcb5c3;[^}]*background:\s*#fff5f7/);
  assert.match(styles, /\.topbarAction:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--seller-accent\)/);
});

test("seller logout delegates session invalidation to the API client", () => {
  assert.match(dashboard, /await postJSON<void>\("\/auth\/logout", \{\}\);/);
  assert.doesNotMatch(dashboard, /(?:document\.cookie|localStorage\.(?:removeItem|clear)|sessionStorage\.(?:removeItem|clear))/);
});
