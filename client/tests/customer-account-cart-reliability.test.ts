import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accountWorkspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const cart = readFileSync(new URL("../src/hooks/useCart.ts", import.meta.url), "utf8");

test("account keeps an authenticated customer mounted while order and address sections independently recover", () => {
  assert.match(accountWorkspace, /type OrdersState = \{ state: "loading" \} \| \{ state: "loaded"; items: CustomerOrder\[\] \} \| \{ state: "error"; message: string \}/);
  assert.match(accountWorkspace, /type AddressesState = \{ state: "loading" \} \| \{ state: "loaded"; items: ShippingAddress\[\] \} \| \{ state: "error"; message: string \}/);
  assert.match(accountWorkspace, /await getJSON<\{ account: Account \}>\("\/auth\/me"\)/);
  assert.match(accountWorkspace, /setAccount\(current\);[\s\S]*void loadOrders\(\);[\s\S]*void loadAddresses\(\);/);
  assert.match(accountWorkspace, /ordersState\.state === "loading"[\s\S]*ordersState\.state === "error"[\s\S]*Retry loading orders[\s\S]*ordersState\.items\.length/);
  assert.match(accountWorkspace, /addressesState\.state === "loading"[\s\S]*addressesState\.state === "error"[\s\S]*Retry loading addresses[\s\S]*addressesState\.items\.length/);
});

test("authenticated cart hydration failures retain server authority and offer a retry", () => {
  assert.match(cart, /export type CartLoadState = \{ state: "idle" \} \| \{ state: "loading" \} \| \{ state: "error"; message: string \}/);
  assert.match(cart, /await getJSON<\{ account: Account \}>\("\/auth\/me"\);[\s\S]*setAuthenticated\(true\);[\s\S]*await loadServerCart\(\);/);
  assert.match(cart, /const loadServerCart = async \(\) => \{[\s\S]*getJSON<\{ items: PersistentCartLine\[\] \}>\("\/cart\/items"\)[\s\S]*setCartLoadState\(\{ state: "error"/);
  assert.match(cart, /const loadServerCart = async \(\) => \{[\s\S]*catch \(reason\) \{[\s\S]*setCartLoadState\(\{ state: "error"/);
  assert.match(cart, /return \{[\s\S]*cartLoadState,[\s\S]*retryCartLoad/);
});
