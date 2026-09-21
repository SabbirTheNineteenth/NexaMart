import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("admin logout uses the shared server logout contract with pending and error recovery", () => {
  assert.match(dashboard, /import \{ getJSON, patchJSON, postJSON \} from "@\/lib\/api";/);
  assert.match(dashboard, /type LogoutState = \{ state: "idle" \} \| \{ state: "pending" \} \| \{ state: "error"; message: string \};/);
  assert.match(dashboard, /const \[logoutState, setLogoutState\] = useState<LogoutState>\(\{ state: "idle" \}\);/);
  assert.match(dashboard, /const logout = async \(\) => \{[\s\S]*?setLogoutState\(\{ state: "pending" \}\);[\s\S]*?await postJSON<void>\("\/auth\/logout", \{\}\);[\s\S]*?router\.replace\("\/"\);[\s\S]*?catch \(reason\) \{[\s\S]*?setLogoutState\(\{ state: "error", message:/);
});

test("admin logout is accessible while pending and exposes an alert-backed retry after failure", () => {
  assert.match(dashboard, /<button className="admin-sidebar-logout" type="button" onClick=\{\(\) => void logout\(\)\} disabled=\{logoutState\.state === "pending"\}>\{logoutState\.state === "pending" \? "Signing out…" : "Sign out"\}<\/button>/);
  assert.match(dashboard, /logoutState\.state === "error" && <div className="admin-sidebar-logout-error" role="alert">[\s\S]*?logoutState\.message[\s\S]*?<button className="admin-sidebar-logout-retry" type="button" onClick=\{\(\) => void logout\(\)\}>Try signing out again<\/button>/);
});
