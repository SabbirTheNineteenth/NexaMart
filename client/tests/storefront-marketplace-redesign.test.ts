import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("marketplace header provides compact account, search, bag, and a secondary category navigation", () => {
  assert.match(storefront, /className="shell marketplace-topbar"/);
  assert.match(storefront, /aria-label="Search the marketplace"/);
  assert.match(storefront, /<a className="marketplace-action-icon" href="\/account" aria-label="Open account">/);
  assert.match(storefront, /aria-label="Marketplace categories"/);
  assert.match(storefront, /aria-label="Browse all departments"/);
});

test("catalog discovery is driven by loaded catalog products and taxonomy", () => {
  assert.match(storefront, /const departmentTiles = useMemo\(/);
  assert.match(storefront, /const featuredProducts = useMemo\(/);
  assert.match(storefront, /aria-label="Browse departments"/);
  assert.match(storefront, /aria-label="Explore brands"/);
  assert.match(storefront, /taxonomy\.brands\.map/);
  assert.match(storefront, /ProductVisual key=\{item\.product\.id\} product=\{item\.product\}/);
});

test("real product cards retain accessible save and add-to-bag actions", () => {
  assert.match(storefront, /aria-label=\{`Save \$\{product\.name\} to saved pieces`\}/);
  assert.match(storefront, /product\.inStock \? "Add to bag" : "Out of stock"/);
  assert.match(storefront, /onClick=\{\(\) => void addToCart\(product\)\}/);
});

test("SellMate-inspired marketplace discovery keeps NexaMart’s real customer workflows", () => {
  assert.match(storefront, /href=\{headerWishlistPath\(cart\.authenticated\)\}/);
  assert.match(storefront, /className="storefront customer-experience orchid-explore reference-explore-layout"/);
  assert.doesNotMatch(storefront, /Popular with customers|product\.rating|product\.reviews/);
  assert.match(styles, /\/\* UI-02 Obsidian Orchid customer explore surface \*\//);
});

test("SellMate-inspired marketplace layout emphasizes category-led commercial browsing", () => {
  assert.match(styles, /\/\* Commercial marketplace layout \*\//);
  assert.match(styles, /\.marketplace-hero\{[^}]*grid-template-columns:minmax\(0,1\.18fr\) minmax\(340px,\.82fr\)/);
  assert.match(styles, /\.department-tile-rail\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.department-tile\{[^}]*height:280px/);
  assert.match(styles, /\.spotlight-card\{[^}]*border-radius:10px/);
});

test("marketplace rails remain horizontally scrollable and mobile navigation stays usable", () => {
  assert.match(styles, /\.marketplace-rail\{[\s\S]*overflow-x:auto/);
  assert.match(styles, /\.department-tile-rail\{[\s\S]*overflow-x:auto/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*\.marketplace-category-nav/);
  assert.match(styles, /--orchid-obsidian:#15111b/);
});
