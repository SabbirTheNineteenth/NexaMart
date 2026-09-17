import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { headerWishlistPath } from "../src/features/catalog/header-wishlist";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const account = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("authenticated customers are sent directly to the Account wishlist section", () => {
  assert.equal(headerWishlistPath(true), "/account#wishlist");
});

test("guests safely fall back to Account instead of a wishlist-only destination", () => {
  assert.equal(headerWishlistPath(false), "/account");
});

test("marketplace header uses the authentication-aware wishlist destination", () => {
  assert.match(storefront, /import \{ headerWishlistPath \} from "@\/features\/catalog\/header-wishlist";/);
  assert.match(storefront, /href=\{headerWishlistPath\(cart\.authenticated\)\}[^>]*>Wishlist<\/Link>/);
  assert.match(account, /<section id="wishlist" className="account-wishlist"/);
});
