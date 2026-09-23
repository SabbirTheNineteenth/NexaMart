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
test("Storefront gives API-backed discovery products a readable rail, real actions, and reduced-motion safeguards", () => {
  assert.match(storefront, /const \[spotlightRailVisible, setSpotlightRailVisible\] = useState\(false\);/);
  assert.match(storefront, /const spotlightRailRef = useRef<HTMLDivElement>\(null\);/);
  assert.match(storefront, /ref=\{spotlightRailRef\}/);
  assert.match(storefront, /className=\{styles\.spotlightRail\}[^>]*tabIndex=\{0\}/);
  assert.match(storefront, /const presentation = buildProductPresentation\(product\);/);
  assert.match(storefront, /presentation\.brand \?\? product\.category/);
  assert.match(storefront, /product\.inStock && <p className=\{styles\.spotlightAvailability\}>In stock<\/p>/);
  assert.match(storefront, /href=\{`\/products\/\$\{product\.slug\}`\}>View product<\/a>/);
  assert.match(storefront, /disabled=\{!product\.inStock \|\| cartAdd\?\.state === "pending"\}/);
  assert.match(storefront, /product\.inStock \? "Add to bag" : "Out of stock"/);
  assert.match(styles, /\.spotlightRail\s*\{[\s\S]*?scroll-snap-type: x mandatory;[\s\S]*?scrollbar-width: none;/);
  assert.match(styles, /\.spotlightCard\s*\{[\s\S]*?flex: 0 0 clamp\(14\.5rem, 20vw, 17\.5rem\);/);
  assert.match(styles, /\.spotlightAddButton\s*\{[\s\S]*?min-height: 44px;[\s\S]*?background: var\(--orchid-violet/);
  assert.match(styles, /\.spotlightCardVisible\s*\{[\s\S]*?animation: spotlight-card-in 280ms/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.spotlightCardVisible[\s\S]*?animation: none;/);
});

test("Storefront gives the catalog hero one truthful, motion-safe real-product gallery", () => {
  assert.match(storefront, /const heroProducts = useMemo\(\(\) => catalog\.products\.filter\(\(product\) => Boolean\(productImageSource\(product\.image, product\.id\)\)\)\.slice\(0, 4\), \[catalog\.products\]\);/);
  assert.match(storefront, /className="marketplace-hero reference-collection-hero" aria-labelledby="explore-heading"/);
  assert.match(storefront, /function HeroDiscoveryCanvas\(\{ products \}/);
  assert.match(storefront, /const activeProduct = products\[activeIndex % products\.length\];/);
  assert.match(storefront, /window\.setInterval\(\(\) => setActiveIndex\(\(index\) => \(index \+ 1\) % products\.length\), 5000\)/);
  assert.match(storefront, /activeProduct\.slug/);
  assert.match(storefront, /No catalog product image is available right now\./);
  assert.doesNotMatch(storefront, /heroDiscoveryCard|heroDiscoveryDetails|className="marketplace-hero-note reference-hero-context"|From the catalog/);
  assert.match(storefront, /Browse products <ArrowUpRight size=\{18\}\/>/);
  assert.match(storefront, /Browse departments/);
  assert.match(styles, /\.heroGalleryStage\s*\{[\s\S]*?overflow: hidden;/);
  assert.match(styles, /@keyframes hero-gallery-enter/);
  assert.match(styles, /\.heroMediaFrame\s*\{[\s\S]*?aspect-ratio: 16 \/ 10;/);
  assert.match(styles, /\.heroCopyEnter\s*\{[\s\S]*?animation: hero-copy-in 420ms/);
  assert.match(styles, /\.heroMediaEnter\s*\{[\s\S]*?animation: hero-media-in 520ms/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.heroGalleryMedia[\s\S]*?animation: none;/);
  assert.doesNotMatch(storefront, /rating|delivery|discount|seller claim/i);
});

test("Storefront keeps its full marketplace shell API-backed, navigable, and motion-safe", () => {
  assert.match(storefront, /<header id="top" className="marketplace-header"/);
  assert.match(storefront, /aria-label="Search the marketplace"/);
  assert.match(storefront, /headerWishlistPath\(cart\.authenticated\)/);
  assert.match(storefront, /aria-label="Open shopping bag"/);
  assert.match(storefront, /aria-label="Product search and filters"/);
  assert.doesNotMatch(storefront, /reference-recently-viewed|Clear recently viewed/);
  assert.match(styles, /:global\(\.storefront \.marketplace-topbar\)\s*\{[\s\S]*?min-height: 64px;/);
  assert.match(styles, /:global\(\.storefront \.reference-explore-content \.product-grid\)\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(styles, /:global\(\.storefront \.department-showcase\),[\s\S]*?:global\(\.storefront \.deal-showcase\)\s*\{[\s\S]*?max-width: min\(100%, 1240px\);/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.spotlightCardVisible[\s\S]*?animation: none;/);
  assert.doesNotMatch(storefront, /rating|review|discount percentage|delivery estimate/i);
});

test("Storefront keeps the catalog toolbar and results in one content-driven flow column", () => {
  assert.match(storefront, /<div className=\{styles\.catalogWorkspace\}>[\s\S]*?className="reference-product-toolbar"[\s\S]*?className=\{styles\.catalogResults\}/);
  assert.match(styles, /\.catalogWorkspace\s*\{[\s\S]*?display: grid;[\s\S]*?gap: clamp\(1rem, 1\.5vw, 1\.25rem\);[\s\S]*?align-content: start;/);
  assert.match(styles, /grid-template-areas:[\s\S]*?"hero hero"[\s\S]*?"filters catalog";/);
  assert.doesNotMatch(styles, /grid-area: toolbar;[\s\S]*?\.catalogResults\s*\{\s*grid-area: results;/);
  assert.doesNotMatch(styles, /"filters toolbar"|"filters results"|"recent/);
});

test("Storefront gives its sidebar, hero, cards, and brand rail local responsive safeguards", () => {
  assert.match(styles, /\.storefrontLayout[\s,]*:global\(\.storefront \.reference-explore-content\)\s*\{[\s\S]*?grid-template-columns: minmax\(12rem, 14rem\) minmax\(0, 1fr\);/);
  assert.match(styles, /\.heroHeading[\s,]*:global\(\.storefront #explore-heading\)\s*\{[\s\S]*?max-width: 13ch;/);
  assert.match(styles, /\.brandTrack\s*\{[\s\S]*?animation: brand-marquee 26s linear infinite;/);
  assert.match(styles, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.storefrontLayout\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.brandTrack[\s\S]*?animation: none/);
  assert.match(styles, /\.productCardFooter\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
});

test("Storefront presents API-backed brands in an accessible, seamless marquee", () => {
  assert.match(storefront, /aria-labelledby="brand-discovery-heading"/);
  assert.match(storefront, /<p className="eyebrow">Shop by brand<\/p><h2 id="brand-discovery-heading">Explore brands in the catalog<\/h2><p>Choose a brand to refine the current catalog\.<\/p>/);
  assert.match(storefront, /role="group" aria-label="Explore brands"/);
  assert.match(storefront, /aria-pressed=\{brand === item\.slug\}/);
  assert.match(storefront, /setBrand\(brand === item\.slug \? "" : item\.slug\); scrollToCollection\(\);/);
  assert.match(storefront, /className=\{styles\.brandDuplicateSequence\} aria-hidden="true"/);
  assert.match(storefront, /<span key=\{`duplicate-\$\{item\.id\}`\} className=\{`\$\{styles\.brandDuplicate\}/);
  assert.match(styles, /\.brandShowcase\s*\{[\s\S]*?overflow: hidden;[\s\S]*?background:/);
  assert.match(styles, /\.brandMarquee\s*\{[\s\S]*?overflow: hidden;[\s\S]*?mask-image:/);
  assert.match(styles, /\.brandTrack\s*\{[\s\S]*?animation: brand-marquee 26s linear infinite;/);
  assert.match(styles, /@keyframes brand-marquee[\s\S]*?transform: translateX\(-50%\);/);
  assert.match(styles, /\.brandChip\s*\{[\s\S]*?min-height: 44px;/);
  assert.match(styles, /\.brandMarquee:hover \.brandTrack,[\s\S]*?animation-play-state: paused;/);
  assert.match(styles, /@media \(max-width: 700px\)\s*\{[\s\S]*?\.brandDuplicateSequence[\s\S]*?display: none;/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.brandTrack[\s\S]*?animation: none;[\s\S]*?\.brandDuplicateSequence[\s\S]*?display: none;/);
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
