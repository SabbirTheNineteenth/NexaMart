import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/Storefront.module.css", import.meta.url), "utf8");

test("Storefront gives desktop filters a bounded sticky rail and restores normal flow below tablet", () => {
  assert.match(styles, /@media \(min-width: 901px\)[\s\S]*?\.reference-facet-rail[\s\S]*?max-height: calc\(100dvh - 5\.5rem\);/);
  assert.match(styles, /@media \(min-width: 901px\)[\s\S]*?\.sidebarDiscovery[\s\S]*?overflow-y: auto;/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.reference-facet-rail[\s\S]*?position: static;/);
});
test("Storefront discovery uses real products for a motion-safe hero and real-price collections", () => {
  assert.match(storefront, /const heroProducts = useMemo\(\(\) => uniqueProductsByImage\(catalog\.products\)\.slice\(0, 4\), \[catalog\.products\]\);/);
  assert.match(storefront, /HeroDiscoveryCanvas products=\{heroProducts\}/);
  assert.match(storefront, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(storefront, /const activeProduct = products\[activeIndex % products\.length\];/);
  assert.match(storefront, /activeProduct\.slug/);
  assert.match(storefront, /No catalog product image is available right now\./);
  assert.doesNotMatch(storefront, /heroDiscoveryCard|heroDiscoveryDetails|marketplace-hero-note reference-hero-context/);
  assert.match(styles, /\.heroGalleryStage\s*\{[\s\S]*?overflow: hidden;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.heroGalleryMedia[\s\S]*?animation: none;/);
  assert.match(storefront, /const flashDeals = useMemo\(\(\) => selectUniqueProductsByImage\(catalog\.products\.filter\(\(product\) => product\.effectivePrice !== undefined && product\.effectivePrice < product\.price\), 4\)/);
  assert.match(storefront, /\{flashDeals\.length > 0 && <section/);
  assert.doesNotMatch(storefront, /Hot Picks|Trending/);
});

test("Storefront discovery cards and footer preserve real routes and actions without invented help claims", () => {
  assert.match(storefront, /function DiscoveryProductCard/);
  assert.match(storefront, /product\.slug/);
  assert.match(storefront, /onClick=\{onSave\}/);
  assert.match(storefront, /onClick=\{onAdd\}/);
  assert.match(storefront, /styles\.storefrontFooter/);
  assert.match(storefront, /href="\/deals"/);
  assert.match(storefront, /href="\/stores"/);
  assert.match(storefront, /href="\/account"/);
  assert.match(storefront, /headerWishlistPath\(cart\.authenticated\)/);
  assert.doesNotMatch(storefront, /support@|Privacy Policy|Terms of Service|payment methods|Follow us/i);
});
