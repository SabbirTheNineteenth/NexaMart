import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin account oversight requests a bounded selected limit from its dedicated loader", () => {
  assert.match(dashboard, /const \[accountLimit, setAccountLimit\] = useState\("25"\);/);
  assert.match(dashboard, /getJSON<\{ accounts: AdminAccount\[\] \}>\(`\/admin\/accounts\?limit=\$\{accountLimit\}`, signal\)/);
  assert.match(dashboard, /<label htmlFor="account-limit">Accounts to show<\/label>/);
  assert.match(dashboard, /<select id="account-limit"[^>]*value=\{accountLimit\}/);
  for (const limit of [1, 10, 25, 50, 100]) assert.match(dashboard, new RegExp(`<option value="${limit}">${limit}<\\/option>`));
});

test("admin account oversight provides isolated loading retryable error and empty states", () => {
  const start = dashboard.indexOf('className="admin-panel admin-accounts"');
  const panel = dashboard.slice(start);

  assert.match(panel, /Loading account records…/);
  assert.match(panel, /Unable to load account records\./);
  assert.match(panel, /onClick=\{\(\) => void loadAccounts\(\)\}/);
  assert.match(panel, /No accounts are available for oversight\./);
});

test("admin account oversight shows only safe account fields plus seller store and status", () => {
  const start = dashboard.indexOf('className="admin-panel admin-accounts"');
  const panel = dashboard.slice(start);

  assert.match(panel, /account\.name/);
  assert.match(panel, /account\.email/);
  assert.match(panel, /account\.role/);
  assert.match(panel, /account\.createdAt/);
  assert.match(panel, /account\.seller\?\.storeName/);
  assert.match(panel, /account\.seller\.status/);
  assert.doesNotMatch(panel, /(?:password|credential|session|token|payment|delivery|patchJSON|postJSON|deleteJSON)/i);
  assert.match(adminTypes, /seller\?: \{ storeName: string; status: AdminSellerStatus \} \| null;/);
});

test("admin account oversight styles its limit selector and account records responsively", () => {
  assert.match(styles, /\.admin-account-controls\{/);
  assert.match(styles, /\.admin-account-controls select\{/);
  assert.match(styles, /\.admin-account-retry\{/);
  assert.match(styles, /@media\(max-width:760px\)\{[^}]*\.admin-account-controls/s);
});
