import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("customer account has a readable customer journey with real navigation and truthful guidance", () => {
  for (const label of ["Orders", "Reviews", "Addresses", "Saved items", "Continue browsing", "Sign out"]) assert.match(workspace, new RegExp(label));
  assert.match(workspace, /Your order history will appear here after your first purchase\./);
  assert.match(workspace, /No delivered purchases are waiting for a review\./);
  assert.match(workspace, /Save delivery addresses to make checkout faster\./);
  assert.match(workspace, /Save products from the catalog to revisit them here\./);
});

test("customer account uses scoped light surfaces, focused address fields, and compact actions", () => {
  for (const token of ["--account-canvas", "--account-surface", "--account-ink", "--account-accent"]) assert.match(styles, new RegExp(token));
  assert.match(styles, /\.accountNavigation/);
  assert.match(styles, /\.addressCreateForm/);
  assert.match(styles, /\.shell :global\(\.primary-button\)[\s\S]*?width: auto/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /background: #171025/);
});

test("account preserves real address and saved-item actions without changing default-address behavior", () => {
  for (const action of ["setDefaultAddress", "requestAddressRemoval", "editAddress", "removeWishlistItem", "Save shipping address"]) assert.match(workspace, new RegExp(action));
  assert.match(workspace, /postJSON<\{ address: ShippingAddress \}>\("\/addresses\/",/);
  assert.doesNotMatch(workspace, /setDefaultAddress\([^)]*\)\s*;\s*await postJSON/);
});

test("saved addresses stay compact until a customer explicitly opens one editor", () => {
  assert.match(workspace, /const \[addressEditors, setAddressEditors\] = useState<Record<string, boolean>>\(\{\}\);/);
  assert.match(workspace, /Edit address/);
  assert.match(workspace, /addressEditors\[address\.id\] && <form/);
  assert.match(workspace, /Add a new address/);
  assert.match(styles, /\.addressCardActions/);
  assert.match(styles, /\.addressEditorForm/);
  assert.match(styles, /\.addressEditorForm \{ width: min\(100%, 680px\); margin-inline: auto;/);
  assert.match(styles, /\.addressFormAction/);
});
