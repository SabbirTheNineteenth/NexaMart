import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("UI-02 gives the customer catalog an Obsidian Orchid explore surface without unsupported commerce claims", () => {
  assert.match(storefront, /className="storefront customer-experience orchid-explore reference-explore-layout"/);
  assert.match(detail, /className="product-detail-shell orchid-explore"/);
  assert.match(styles, /\/\* UI-02 Obsidian Orchid customer explore surface \*\//);

  for (const source of [storefront, detail]) {
    assert.doesNotMatch(source, /flashOfferPresentation|flash-offer|Popular with customers|Customer reviews|product\.rating|product\.reviews|Was \{money|Save \{money|originalPrice/);
  }
});

test("UI-02 retains truthful interactive discovery and browser-local history contracts", () => {
  assert.match(storefront, /aria-label="Search the marketplace"/);
  assert.match(storefront, /aria-label="Sort catalog"/);
  assert.match(storefront, /<option value="newest">Newest arrivals<\/option>/);
  assert.match(storefront, /Saved in this browser\. It is not synced to an account\./);
  assert.match(detail, /recordRecentlyViewedProduct\(detail\.product\)/);
  assert.match(detail, /Available variants/);
  assert.match(detail, /Add to bag/);
});
