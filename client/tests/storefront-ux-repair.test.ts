import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/Storefront.module.css", import.meta.url), "utf8");

test("Storefront keeps catalog actions in a card footer and only renders returned pricing and availability data", () => {
  assert.match(storefront, /<footer className=\{styles\.productCardFooter\}>[\s\S]*?className="quick-add"[\s\S]*?Add to bag/);
  assert.match(storefront, /const currentPrice = effectivePrice \?\? price/);
  assert.match(storefront, /product\.inStock && <div className=\{`reference-availability/);
  const productImage = storefront.match(/<div className="product-image">[\s\S]*?<\/div>\s*<div className="product-copy">/)?.[0] ?? "";
  assert.doesNotMatch(productImage, /className="quick-add"/);
});

test("Storefront gives its sidebar, hero, cards, and brand rail local responsive safeguards", () => {
  assert.match(styles, /\.storefrontLayout[\s,]*:global\(\.storefront \.reference-explore-content\)\s*\{[\s\S]*?grid-template-columns: minmax\(12rem, 14rem\) minmax\(0, 1fr\);/);
  assert.match(styles, /\.heroHeading[\s,]*:global\(\.storefront #explore-heading\)\s*\{[\s\S]*?max-width: 13ch;/);
  assert.match(styles, /\.brandChip\s*\{[\s\S]*?animation: brand-chip-in 360ms/);
  assert.match(styles, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.storefrontLayout\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.brandChip[\s\S]*?animation: none/);
  assert.match(styles, /\.productCardFooter\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
});

test("Storefront removes Recently viewed and preserves an ordered, normal-flow filter stack", () => {
  assert.match(storefront, /<h2 id="filter-products-heading">Filter products<\/h2>/);
  const sidebar = storefront.match(/<div className=\{styles\.sidebarDiscovery\}>[\s\S]*?taxonomy-controls[\s\S]*?aria-label="Discover brands"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? "";
  assert.ok(sidebar.indexOf('<legend>Availability</legend>') < sidebar.indexOf('aria-label="Browse departments"'));
  assert.ok(sidebar.indexOf('aria-label="Browse departments"') < sidebar.indexOf('<legend>Product type</legend>'));
  assert.ok(sidebar.indexOf('<legend>Product type</legend>') < sidebar.indexOf('aria-label="Subcategory"'));
  assert.match(storefront, /role="region" aria-label="Product search and filters"/);
  assert.doesNotMatch(storefront, /recentlyViewedPanel|Recently viewed|recently-viewed|readRecentlyViewedProducts|removeRecentlyViewedProduct|writeRecentlyViewedProducts|RecentlyViewedProduct/);
  assert.match(styles, /\.sidebarSection\s*\{[\s\S]*?border-top: 1px solid/);
  assert.match(styles, /\.sidebarDiscovery\s*\{[\s\S]*?display: grid;[\s\S]*?position: static;[\s\S]*?min-height: max-content;/);
  assert.doesNotMatch(styles, /sidebarRecentlyViewed|reference-recently-viewed/);
  assert.match(styles, /\.sidebarDiscovery :global\(\.reference-facet-group label\)[\s\S]*?min-height: 44px;/);
  assert.match(styles, /\.sidebarDiscovery :global\(\.taxonomy-controls select\)[\s\S]*?min-height: 44px;/);
});
