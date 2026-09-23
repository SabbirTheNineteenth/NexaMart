import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productImageSource } from "../src/features/catalog/product-presentation";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("UI-02 mobile navigation retains Account and Wishlist destinations", () => {
  assert.match(storefront, /<nav[\s\S]*className="mobile-marketplace-account" href=\{headerWishlistPath\(cart\.authenticated\)\}/);
  assert.match(storefront, /className="mobile-marketplace-account" href=\{accountDestination\(cart\.accountRole\)\} aria-label=\{accountDestinationLabel\(cart\.accountRole\)\}/);
});

test("UI-02 collection scrolling respects reduced-motion preferences", () => {
  assert.match(storefront, /const scrollToCollection = \(\) => \{[\s\S]*matchMedia\("\(prefers-reduced-motion: reduce\)"\)[\s\S]*scrollIntoView\(\{ behavior: prefersReducedMotion \? "auto" : "smooth", block: "start" \}\);[\s\S]*\};/);
  assert.equal((storefront.match(/scrollIntoView/g) ?? []).length, 1);
});

test("UI-02 catalog copy makes no unsupported editorial quality or curation claims", () => {
  assert.doesNotMatch(storefront, /Our point of view|The Nexa edit|Made for the ritual|quiet character|durable materials|thoughtfully chosen|Not more\. Better|earn their place|enduring form|honest materials/i);
});

test("UI-02 unavailable product images do not substitute product-ID-specific editorial media", () => {
  assert.equal(productImageSource("💡", "p-lumen"), undefined);
  assert.equal(productImageSource("🎁", "unknown-product"), undefined);
});

test("UI-02 Orchid controls use violet focus instead of the legacy olive token", () => {
  assert.match(styles, /\.orchid-explore :is\(a,button,input,select\):focus-visible\{outline-color:var\(--orchid-violet\)\}/);
  assert.doesNotMatch(styles, /\.orchid-explore[^\n]*#6d8d12/);
});
