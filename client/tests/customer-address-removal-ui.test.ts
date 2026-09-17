import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("customers can confirm removal of one named address and only remove it locally after DELETE succeeds", () => {
  assert.match(workspace, /type AddressRemovalState = \{ state: "confirming" \} \| \{ state: "removing" \} \| \{ state: "success" \} \| \{ state: "error"; message: string \};/);
  assert.match(workspace, /const \[addressRemovals, setAddressRemovals\] = useState<Record<string, AddressRemovalState \| undefined>>\(\{\}\);/);
  assert.match(workspace, /await deleteJSON<void>\(`\/addresses\/\$\{address\.id\}`\);/);
  assert.match(workspace, /setAddressesState\(\(current\) => current\.state === "loaded" \? \{ state: "loaded", items: current\.items\.filter\(\(saved\) => saved\.id !== address\.id\)/);
  assert.match(workspace, /aria-label=\{`Remove shipping address for \$\{address\.recipientName\}`\}/);
  assert.match(workspace, /Remove this address\?/);
  assert.match(workspace, /Confirm removal/);
  assert.match(workspace, /Cancel/);
});

test("address removal keeps confirmation, pending, error, and 404 feedback scoped to that address", () => {
  assert.match(workspace, /const removal = addressRemovals\[address\.id\];/);
  assert.match(workspace, /removal\?\.state === "confirming"/);
  assert.match(workspace, /removal\?\.state === "removing"/);
  assert.match(workspace, /removal\?\.state === "error"/);
  assert.match(workspace, /Removing address…/);
  assert.match(workspace, /Address was not found or is no longer available\./);
  assert.match(workspace, /role="alert"/);
  assert.match(styles, /\.account-address-remove/);
  assert.match(styles, /\.account-address-removal-confirmation/);
});
