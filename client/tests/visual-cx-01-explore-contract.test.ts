import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");

test("VISUAL-CX-01 keeps Explore's dark browse hierarchy data-bound and landmarked", () => {
  assert.match(storefront, /<header id="top" className="marketplace-header"/);
  assert.match(storefront, /aria-label="Marketplace categories"/);
  assert.match(storefront, /<section className="marketplace-hero reference-collection-hero" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<h1 id="explore-heading">Browse <em>catalog products\.<\/em><\/h1>/);
  assert.match(storefront, /<aside className="marketplace-hero-note reference-hero-context" aria-label="Current catalog context" aria-live="polite">/);
  assert.match(storefront, /<div className="catalog-tools taxonomy-discovery reference-facet-rail" role="region" aria-label="Product search and filters">/);
  assert.match(storefront, /aria-label="Browse departments"/);
  assert.match(storefront, /aria-label="Discover brands"/);
  assert.match(storefront, /catalogLoaded && !visibleProducts\.length/);
  assert.match(storefront, /Saved in this browser\. It is not synced to an account\./);
});

test("VISUAL-CX-01 preserves the selected product's focused Explore context", () => {
  assert.match(detail, /<main className="product-detail-shell orchid-explore" aria-labelledby="product-detail-heading">/);
  assert.match(detail, /<h1 id="product-detail-heading">\{product\.name\}<\/h1>/);
  assert.match(detail, /recordRecentlyViewedProduct\(detail\.product\)/);
  assert.doesNotMatch(detail, /rating|review|recommend|shipping promise|delivery promise/i);
});
