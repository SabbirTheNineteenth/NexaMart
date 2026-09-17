import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("PARITY-R01 keeps the real Explore storefront at the root rather than merging role concepts", () => {
  assert.match(home, /<Storefront \/>/);
  assert.doesNotMatch(home, /ReferenceParityShell/);
});

test("PARITY-C01 gives the real Explore route the reference compact facet-led desktop structure", () => {
  assert.match(storefront, /reference-explore-layout/);
  assert.match(storefront, /reference-facet-rail/);
  assert.match(storefront, /reference-explore-content/);
});

test("PARITY-C01 orders the live collection workspace ahead of non-reference discovery showcases", () => {
  assert.match(styles, /\.reference-explore-layout\{display:flex;flex-direction:column/);
  assert.match(styles, /\.reference-explore-layout \.reference-explore-content\{order:2/);
  assert.match(styles, /\.reference-explore-layout \.department-showcase\{order:3/);
});

test("PARITY-C01 retains the reference editorial copy beside the desktop catalog hero art", () => {
  assert.doesNotMatch(
    styles,
    /\.reference-explore-layout \.marketplace-hero-copy\{display:none\}/,
    "the reference customer panel has an editorial left column; it must not be hidden on desktop",
  );
  assert.match(
    styles,
    /\.reference-explore-layout \.marketplace-hero\{order:1;grid-template-columns:minmax\(220px,.65fr\) minmax\(0,1.35fr\)/,
    "desktop hero needs a text and visual hierarchy rather than an image-only banner",
  );
  assert.match(styles, /\.reference-explore-layout \.marketplace-hero-media\{height:190px;min-height:190px\}/);
});

test("PARITY-C01 uses the compact Explore app-bar hierarchy instead of a utility masthead", () => {
  assert.doesNotMatch(storefront, /marketplace-utility/);
  assert.match(storefront, /reference-explore-tabs/);
  assert.match(storefront, />Shop</);
  assert.match(storefront, />Categories</);
  assert.match(storefront, />New Arrivals</);
  assert.match(storefront, />For You</);
  assert.match(storefront, /aria-label="Open saved pieces"/);
  assert.match(storefront, /aria-label="Open account"/);
});

test("PARITY-C01 aligns the dense product grid with the top of the facet rail", () => {
  assert.match(styles, /\.reference-facet-rail\{position:sticky;top:14px;grid-column:1;grid-row:2/);
  assert.match(styles, /\.reference-explore-content \.product-grid\{grid-column:2;grid-row:2/);
});

test("PARITY-C03 keeps hero context as a dedicated third desktop column", () => {
  assert.match(storefront, /reference-hero-context/);
  assert.match(styles, /\.reference-explore-layout \.marketplace-hero\{grid-template-columns:minmax\(220px,.65fr\) minmax\(0,1.35fr\) 150px/);
});

test("PARITY-C03 places the live editorial hero beside the desktop facet rail before the product grid", () => {
  const collection = storefront.indexOf('className="collection shell customer-collection reference-explore-content"');
  const facets = storefront.indexOf('className="catalog-tools taxonomy-discovery reference-facet-rail"', collection);
  const hero = storefront.indexOf('className="marketplace-hero reference-collection-hero"', collection);
  const products = storefront.indexOf('className="product-grid"', collection);
  assert.ok(collection >= 0 && facets > collection && hero > facets && products > hero, "the hero must be part of the live facet/product workspace");
  assert.match(styles, /\.reference-explore-content>.reference-collection-hero\{grid-column:2;grid-row:1;[^}]*grid-template-columns:minmax\(170px,.7fr\) minmax\(0,1.25fr\) 130px/);
  assert.match(styles, /\.reference-facet-rail\{position:sticky;top:14px;grid-column:1;grid-row:1;grid-row:span 4/);
  assert.match(styles, /@media\(max-width:960px\)\{\s*\.reference-explore-content\{display:flex;flex-direction:column\}[\s\S]*\.reference-explore-content>.reference-collection-hero\{order:1\}/);
});

test("PARITY-C04 gives the live four-card catalog grid its compact sort, heart, variant, and availability composition", () => {
  assert.match(storefront, /className="reference-product-toolbar"/);
  assert.match(storefront, /aria-controls="catalog-product-grid"/);
  assert.match(storefront, /<div id="catalog-product-grid" className="product-grid">/);
  assert.match(storefront, /aria-label="Catalog grid view"/);
  assert.match(storefront, /className="reference-variant-summary"/);
  assert.match(storefront, /className=\{`reference-availability is-\$\{availabilityState\}`\}/);
  assert.match(storefront, /aria-label=\{`Save \$\{product\.name\} to saved pieces`\}/);
  assert.match(styles, /\.reference-product-toolbar\{display:flex;align-items:center;justify-content:space-between/);
  assert.match(styles, /\.reference-explore-content \.product-grid\{grid-column:2;grid-row:3;grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:10px/);
  assert.match(styles, /\.reference-variant-dot\{width:7px;height:7px;border-radius:50%/);
  assert.match(styles, /\.reference-availability\.is-in-stock::before/);
  assert.match(styles, /\.reference-explore-content \.wishlist-button\{top:12px;right:12px;bottom:auto/);
  assert.match(styles, /\.reference-explore-content \.product-description\{display:none/);
});

test("PARITY-C04 keeps the live grid toolbar truthful while catalog results are still loading", () => {
  assert.match(
    storefront,
    /const productCountLabel = catalogLoaded \? `\$\{visibleProducts\.length\} \$\{visibleProducts\.length === 1 \? "product" : "products"\}` : "Loading products";/,
    "the result counter must not announce a fabricated zero before the API-backed grid is available",
  );
  assert.match(storefront, /<p className="product-count" aria-live="polite">\{productCountLabel\}<\/p>/);
});

test("PARITY-C05 places the browser-local recently viewed rail directly beneath the live product grid", () => {
  const collection = storefront.indexOf('className="collection shell customer-collection reference-explore-content"');
  const productGrid = storefront.indexOf('className="product-grid"', collection);
  const recentlyViewed = storefront.indexOf('className="recently-viewed reference-recently-viewed"', collection);
  const collectionEnd = storefront.indexOf('</section>', recentlyViewed);
  assert.ok(collection >= 0 && productGrid > collection && recentlyViewed > productGrid && collectionEnd > recentlyViewed, "recently viewed must stay in the live collection after the catalog grid");
  assert.match(storefront, /Saved in this browser\. It is not synced to an account\./);
  assert.match(styles, /\.reference-explore-content>\.reference-recently-viewed\{grid-column:2;grid-row:5/);
  assert.match(styles, /\.reference-explore-content>\.reference-recently-viewed\{order:4\}/);
  assert.match(styles, /\.reference-recently-viewed \.recently-viewed-note\{display:block/);
});
