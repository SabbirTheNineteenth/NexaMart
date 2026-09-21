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

test("Storefront keeps subcategory, brand discovery, and recently viewed controls in one normal-flow facet stack", () => {
  assert.match(storefront, /const recentlyViewedPanel = recentlyViewed\.length > 0 \? <section className=\{`recently-viewed reference-recently-viewed \$\{styles\.sidebarRecentlyViewed\}`}/);
  assert.match(storefront, /<div className=\{styles\.sidebarDiscovery\}>[\s\S]*?className="taxonomy-controls"[\s\S]*?aria-label="Discover brands"[\s\S]*?\{recentlyViewedPanel\}/);
  assert.match(styles, /\.sidebarDiscovery\s*\{[\s\S]*?display: grid;[\s\S]*?position: static;[\s\S]*?min-height: max-content;/);
  assert.match(styles, /\.sidebarRecentlyViewed\s*\{[\s\S]*?grid-area: auto;[\s\S]*?position: static;/);
  assert.match(styles, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.sidebarDiscovery[\s\S]*?min-width: 0;[\s\S]*?\.sidebarDiscovery :global\(\.brand-discovery\)[\s\S]*?max-width: 100%;/);
});
