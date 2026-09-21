import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/Storefront.module.css", import.meta.url), "utf8");

test("catalog feedback is a labelled live region with clear loading and failure recovery", () => {
  assert.match(storefront, /import styles from "\.\/Storefront\.module\.css";/);
  assert.match(storefront, /className=\{styles\.catalogResults\} aria-live="polite" aria-busy=\{!catalogLoaded && !error\}/);
  assert.match(storefront, /Loading catalog products\. Results will appear here\./);
  assert.match(storefront, /<h3 id="catalog-error-heading">Catalog unavailable<\/h3>/);
  assert.match(storefront, /Retry catalog/);
});

test("an unfiltered empty catalog provides a real refresh action while filtered results can be cleared", () => {
  assert.match(storefront, /The current catalog has no products\. Retry to check for updates\./);
  assert.match(storefront, /Clear filters and show all products/);
  assert.match(storefront, /Check catalog again/);
});

test("storefront-local styling keeps the product grid dense, responsive, and focus-visible", () => {
  assert.match(styles, /grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, 11\.5rem\), 1fr\)\);/);
  assert.match(styles, /@media \(max-width: 34rem\)/);
  assert.match(styles, /:global\(\.product-card:focus-within\)/);
  assert.match(styles, /:global\(a:focus-visible\),\s*:global\(button:focus-visible\),\s*:global\(select:focus-visible\),\s*:global\(input:focus-visible\)/);
});
