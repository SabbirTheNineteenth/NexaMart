import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const account = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("VISUAL-10 account keeps a responsive, keyboard-navigable customer workspace composition", () => {
  assert.match(account, /<nav className="orchid-navigation account-section-navigation" aria-label="Account sections">/);
  assert.match(account, /href="#orders"/);
  assert.match(account, /href="#reviews"/);
  assert.match(account, /href="#addresses"/);
  assert.match(account, /href="#wishlist"/);
  assert.match(account, /id="orders" className="account-orders"/);
  assert.match(account, /id="reviews" className="customer-reviews"/);
  assert.match(account, /id="addresses" className="account-addresses"/);
  assert.match(account, /className="trust account-data-summary"/);
  assert.match(account, /ordersState\.state === "loaded" \? ordersState\.items\.length : "—"/);
  assert.match(account, /addressesState\.state === "loaded" \? addressesState\.items\.length : "—"/);
  assert.match(account, /wishlistState\.state === "loaded" \? wishlist\.length : "—"/);
});

test("VISUAL-10 wishlist uses a real image when safe source data exists and names its fallback", () => {
  assert.match(account, /import \{ productImageSource \} from "@\/features\/catalog\/product-presentation"/);
  assert.match(account, /function WishlistMedia\(\{ item \}: \{ item: WishlistItem \}\)/);
  assert.match(account, /productImageSource\(item\.image, item\.id\)/);
  assert.match(account, /<img[^>]*src=\{source\}[^>]*alt=\{item\.name\}[^>]*onError=/);
  assert.match(account, /role="img" aria-label=\{`\$\{item\.name\} product image unavailable`\}/);
  assert.doesNotMatch(account, /<span aria-hidden="true">\{item\.image\}<\/span>/);
});

test("VISUAL-10 retains independent pending, error, and empty recovery states for account data", () => {
  assert.match(account, /Loading orders…[\s\S]*Retry loading orders[\s\S]*Your order history is clear/);
  assert.match(account, /Loading shipping addresses…[\s\S]*Retry loading addresses[\s\S]*Add a shipping address/);
  assert.match(account, /Loading saved pieces…[\s\S]*Try again[\s\S]*Save pieces from the collection/);
  assert.match(account, /disabled=\{logoutState\.state === "pending"\}/);
});
