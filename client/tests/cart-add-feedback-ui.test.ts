import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ApiError } from "../src/lib/api";
import { cartAddError } from "../src/features/cart/cart-add-feedback";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("cart add errors distinguish sign-in, stock, and API failures", () => {
  assert.equal(cartAddError(new ApiError("Unauthorized", 401)), "Sign in from Account to add items to your bag.");
  assert.equal(cartAddError(new ApiError("Forbidden", 403)), "Sign in from Account to add items to your bag.");
  assert.equal(cartAddError(new ApiError("Insufficient stock", 409)), "This item is no longer available in the requested quantity.");
  assert.equal(cartAddError(new ApiError("Item is out of stock", 422)), "This item is no longer available in the requested quantity.");
  assert.equal(cartAddError(new Error("Network unavailable")), "Network unavailable");
});

test("catalog quick add has isolated pending, success, and error feedback", () => {
  assert.match(storefront, /type CartAddState = \{ state: "pending" \} \| \{ state: "success" \} \| \{ state: "error"; message: string \};/);
  assert.match(storefront, /const \[cartAdds, setCartAdds\] = useState<Record<string, CartAddState \| undefined>>\(\{\}\);/);
  assert.match(storefront, /const cartAddingIds = useRef\(new Set<string>\(\)\);/);
  assert.match(storefront, /if \(cartAddingIds\.current\.has\(product\.id\)\) return;/);
  assert.match(storefront, /await cart\.add\(product\);/);
  assert.match(storefront, /\[product\.id\]: \{ state: "success" \}/);
  assert.match(storefront, /const cartAdd = cartAdds\[product\.id\];/);
  assert.match(storefront, /disabled=\{!product\.inStock \|\| cartAdd\?\.state === "pending"\}/);
  assert.match(storefront, /aria-busy=\{cartAdd\?\.state === "pending"\}/);
  assert.match(storefront, /Adding\u2026/);
  assert.match(storefront, /Added to bag\./);
  assert.match(storefront, /role="status"/);
  assert.match(storefront, /role="alert"/);
});

test("product detail waits for add completion and prevents duplicate submissions", () => {
  assert.match(detail, /type CartAddState = \{ state: "pending" \} \| \{ state: "success" \} \| \{ state: "error"; message: string \};/);
  assert.match(detail, /const \[cartAdd, setCartAdd\] = useState<CartAddState \| undefined>\(undefined\);/);
  assert.match(detail, /const cartAddingRef = useRef\(false\);/);
  assert.match(detail, /if \(cartAddingRef\.current\) return;/);
  assert.match(detail, /if \(!\(selectedVariant \? selectedVariant\.stock > 0 : product\.inStock\)\) \{/);
  assert.match(detail, /await cart\.add\(product, selectedVariant \? \{ id: selectedVariant\.id, price: selectedVariant\.price \} : undefined\);/);
  assert.match(detail, /setCartAdd\(\{ state: "success" \}\);/);
  assert.match(detail, /const purchasable = selectedVariant \? selectedVariant\.stock > 0 : product\.inStock;/);
  assert.match(detail, /product = \{ \.\.\.product, inStock: purchasable \};/);
  assert.match(detail, /disabled=\{!product\.inStock \|\| cartAdd\?\.state === "pending"\}/);
  assert.match(detail, /aria-busy=\{cartAdd\?\.state === "pending"\}/);
  assert.match(detail, /Adding(?:\u2026|\\u2026)/);
  assert.match(detail, /Added to bag\./);
  assert.match(detail, /role="status"/);
  assert.match(detail, /role="alert"/);
});

test("cart add feedback has responsive presentation styles", () => {
  assert.match(styles, /\.cart-add-feedback/);
  assert.match(styles, /\.quick-add:disabled/);
  assert.match(styles, /@media\(max-width:760px\)\{[^}]*\.cart-add-feedback/s);
});
