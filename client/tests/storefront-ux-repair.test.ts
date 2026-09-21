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
