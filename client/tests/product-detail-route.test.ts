import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const page = new URL("../src/app/products/[slug]/page.tsx", import.meta.url);
const detail = new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url);

test("product detail route provides a focused, truthful product screen", () => {
  assert.equal(existsSync(page), true);
  assert.equal(existsSync(detail), true);
  const source = readFileSync(detail, "utf8");
  assert.match(source, /getJSON<\{ product: Product \}>\(\`\/catalog\/products\//);
  assert.match(source, /Add to bag/);
  assert.match(source, /className="product-detail-shell orchid-explore"/);
  assert.doesNotMatch(source, /Customer reviews|product\.rating|product\.reviews/);
});

test("product detail keeps Explore context around a focused gallery and purchase panel", () => {
  const source = readFileSync(detail, "utf8");

  assert.match(source, /<nav className="product-detail-context shell" aria-label="Product navigation">/);
  assert.match(source, /<Link href="\/#collection">Back to catalog<\/Link>/);
  assert.match(source, /<section className="product-purchase-panel" aria-label="Purchase options">/);
  assert.match(source, /<p className="product-selected-configuration" role="status">/);
  assert.match(source, /Selected configuration: <strong>\{selectedVariant\.sku\}<\/strong>/);
});

test("VISUAL-7/03 keeps the focused detail in the real Explore header and purchase flow", () => {
  const source = readFileSync(detail, "utf8");

  assert.match(source, /<header className="marketplace-header product-detail-header">/);
  assert.match(source, /<form className="marketplace-search" action="\/" role="search">/);
  assert.match(source, /name="q"/);
  assert.match(source, /headerWishlistPath\(authenticated\)/);
  assert.match(source, /href="\/\?bag=1"/);
  assert.match(source, /<section className="product-purchase-panel" aria-label="Purchase options">/);
  assert.match(source, /<aside className="product-detail-copy product-detail-summary" aria-label="Product summary">/);
});

test("C06 carries the compact Explore hierarchy into the product detail header", () => {
  const source = readFileSync(detail, "utf8");
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(source, /<nav className="reference-explore-tabs product-detail-tabs" aria-label="Explore sections">/);
  assert.match(source, /<Link href="\/#collection">Shop<\/Link><Link href="\/#departments">Categories<\/Link><Link href="\/\?sort=newest">New Arrivals<\/Link>/);
  assert.match(styles, /\.product-detail-header \.product-detail-tabs/);
  assert.match(styles, /\.product-detail-header \.marketplace-topbar\{display:grid;grid-template-columns:auto auto minmax\(220px,1fr\) auto/);
  assert.match(styles, /@media\(max-width:960px\)\{\.product-detail-header \.product-detail-tabs\{display:none/);
});

test("C06 keeps the existing customer destinations reachable as compact controls at every viewport", () => {
  const source = readFileSync(detail, "utf8");
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(source, /className="marketplace-action-icon" href="\/stores" aria-label="Browse stores"/);
  assert.match(source, /className="marketplace-action-icon" href=\{headerWishlistPath\(authenticated\)\} aria-label="View saved pieces"/);
  assert.match(source, /className="marketplace-action-icon" href="\/account" aria-label="Open account"/);
  assert.match(styles, /\.product-detail-header \.marketplace-action-icon\{display:inline-grid/);
  assert.match(styles, /@media\(max-width:760px\)\{\.product-detail-header \.marketplace-actions\{display:flex/);
});

test("C06 gives the focused product route a compact panel-01 context strip", () => {
  const source = readFileSync(detail, "utf8");
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(source, /<nav className="product-detail-context shell" aria-label="Product navigation"><span className="product-detail-panel-label">01 \/ Product detail<\/span><Link href="\/#collection">Back to catalog<\/Link><\/nav>/);
  assert.match(styles, /\.product-detail-context\{display:flex;align-items:center;justify-content:space-between;/);
  assert.match(styles, /\.product-detail-panel-label\{color:var\(--nx-orchid\);font-family:"DM Mono",monospace;/);
  assert.match(styles, /@media\(max-width:760px\)\{\.product-detail-context\{padding:8px 2px/);
});

test("C06 keeps the context-strip return action readable without flex clipping", () => {
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.product-detail-context a\{flex:0 0 auto;white-space:nowrap;/);
  assert.match(styles, /\.product-detail-context\{display:flex;align-items:center;justify-content:space-between;min-height:34px;border-bottom:1px solid var\(--nx-border\);padding:7px 2px\}/);
  assert.match(styles, /@media\(max-width:760px\)\{\.product-detail-context\{padding:8px 2px\}/);
});
