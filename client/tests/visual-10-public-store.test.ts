import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storePage = readFileSync(new URL("../src/features/catalog/PublicStorePage.tsx", import.meta.url), "utf8");

test("VISUAL-10 public store uses the Explore header and returned store collection hierarchy", () => {
  assert.match(storePage, /href="#store-products-heading">Skip to store products<\/a>/);
  assert.match(storePage, /<header className="deals-header">/);
  assert.match(storePage, /<nav aria-label="Marketplace">/);
  assert.match(storePage, /<Link href="\/">Shop<\/Link>/);
  assert.match(storePage, /<Link href="\/deals">Deals<\/Link>/);
  assert.match(storePage, /<Link aria-current="page" href="\/stores">Stores<\/Link>/);
  assert.match(storePage, /<Link href="\/account">Account<\/Link>/);
  assert.match(storePage, /<p className="eyebrow">Store collection<\/p>/);
  assert.match(storePage, /\{store\.storeName\}/);
  assert.match(storePage, /\{store\.productCount\} \{store\.productCount === 1 \? "product" : "products"\}/);
  assert.match(storePage, /<h2 id="store-products-heading">Available products<\/h2>/);
});

test("VISUAL-10 public store preserves truthful product cards and distinct recovery states", () => {
  assert.match(storePage, /getJSON<PublicStorePayload>\(`\/catalog\/stores\/\$\{slug\}`, controller\.signal\)/);
  assert.match(storePage, /Loading store…/);
  assert.match(storePage, /Store unavailable/);
  assert.match(storePage, /Unable to load this storefront\. Try again\./);
  assert.match(storePage, /Retry store/);
  assert.match(storePage, /No products are available from this store right now\./);
  assert.match(storePage, /product\.brand \?\? product\.category/);
  assert.match(storePage, /productImageSource\(product\.image, product\.id\)/);
  assert.match(storePage, /href=\{`\/products\/\$\{product\.slug\}`\}/);
  assert.match(storePage, /effectivePrice \?\? product\.price/);
  assert.match(storePage, /loading="lazy"/);
});

test("VISUAL-10 public store makes no unsupported commerce claims", () => {
  assert.doesNotMatch(storePage, /(?:countdown|rating|savings|save \{|was \{|payment|delivery|recommend)/i);
});
