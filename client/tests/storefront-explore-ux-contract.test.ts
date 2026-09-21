import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/Storefront.module.css", import.meta.url), "utf8");

test("Explore keeps a compact, operable collection search and announces result state changes", () => {
  assert.match(storefront, /<form className=\{styles\.collectionSearch\} role="search" aria-label="Search catalog products" onSubmit=\{\(event\) => \{ event\.preventDefault\(\); scrollToCollection\(\); \}\}>/);
  assert.match(storefront, /aria-controls="catalog-product-grid"/);
  assert.match(storefront, /aria-live="polite" aria-busy=\{!catalogLoaded && !error\}/);
});

test("Explore results retain readable cards, 44px controls, and reduced-motion-safe state continuity", () => {
  assert.match(styles, /min-height: 44px;/);
  assert.match(styles, /\.catalogResults\[aria-busy="true"\] :global\(\.marketplace-load-state\),/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /animation: storefront-state-in 180ms ease-out both;/);
});
