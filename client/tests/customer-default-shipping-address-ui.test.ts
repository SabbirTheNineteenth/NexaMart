import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("new shipping addresses leave default selection to the server", () => {
  assert.match(workspace, /await postJSON<\{ address: ShippingAddress \}>\("\/addresses\/", \{ recipientName: String\(form\.get\("recipientName"\)\), phone: String\(form\.get\("phone"\)\), line1: String\(form\.get\("line1"\)\), city: String\(form\.get\("city"\)\), country: String\(form\.get\("country"\) \|\| "BD"\) \}\);/);
});

test("customers can set one saved shipping address as default only after the default endpoint succeeds", () => {
  assert.match(workspace, /type AddressDefaultState = \{ state: "saving" \} \| \{ state: "success" \} \| \{ state: "error"; message: string \};/);
  assert.match(workspace, /const \[addressDefaults, setAddressDefaults\] = useState<Record<string, AddressDefaultState \| undefined>>\(\{\}\);/);
  assert.match(workspace, /await patchJSON<\{ address: ShippingAddress \}>\(`\/addresses\/\$\{address\.id\}\/default`\);/);
  assert.match(workspace, /setAddressesState\(\(current\) => current\.state === "loaded" \? \{ state: "loaded", items: current\.items\.map\(\(saved\) => saved\.id === updatedAddress\.id \? \{ \.\.\.updatedAddress, isDefault: true \} : \{ \.\.\.saved, isDefault: false \}\)/);
});

test("default-address actions name the address and expose selected, pending, success, and 404 states", () => {
  assert.match(workspace, /address\.isDefault && <span className="status order-confirmed"[^>]*>Default<\/span>/);
  assert.match(workspace, /!address\.isDefault && <button[^>]*aria-label=\{`Set \$\{address\.recipientName\} as default shipping address`\}/);
  assert.match(workspace, /Setting default address…/);
  assert.match(workspace, /Default shipping address saved\./);
  assert.match(workspace, /Address was not found or is no longer available\./);
  assert.match(workspace, /role="status"/);
  assert.match(workspace, /role="alert"/);
  assert.match(styles, /\.account-address-default-action/);
});
