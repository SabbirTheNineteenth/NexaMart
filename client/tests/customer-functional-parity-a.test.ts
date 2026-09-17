import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const deals = readFileSync(new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url), "utf8");
const directory = readFileSync(new URL("../src/features/catalog/StoreDirectory.tsx", import.meta.url), "utf8");
const storePage = readFileSync(new URL("../src/features/catalog/PublicStorePage.tsx", import.meta.url), "utf8");
const exploreHeader = readFileSync(new URL("../src/components/ExploreHeader.tsx", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../src/features/catalog/product-presentation.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("QA parity A keeps customer discovery surfaces factual and free of countdown offers", () => {
  for (const source of [deals, directory, storePage]) {
    assert.doesNotMatch(source, /(?:flash offer|countdown|setInterval|Was \{|Save \{|discountPercent|rating|recommend|payment|delivery)/i);
  }
  assert.doesNotMatch(presentation, /flashOfferPresentation|FlashOfferPresentation|remainingSeconds|discountPercent/);
});

test("QA parity A gives Deals, stores, and public stores the same Orchid customer surface", () => {
  assert.match(deals, /className="deals-discovery customer-experience orchid-explore"/);
  assert.match(directory, /className="store-directory customer-experience orchid-explore"/);
  assert.match(storePage, /className="public-store-page customer-experience orchid-explore"/);
  assert.match(deals, /<ExploreHeader active="deals" \/>/);
  assert.match(directory, /<ExploreHeader active="stores" \/>/);
  assert.match(storePage, /<ExploreHeader active="stores" \/>/);
  assert.match(exploreHeader, /aria-label="Explore navigation"/);
  assert.match(exploreHeader, /event\.key === "Escape"/);
  assert.match(styles, /\.orchid-explore\.store-directory/);
  assert.match(styles, /\.orchid-explore\.public-store-page/);
  assert.match(styles, /\.orchid-explore\.deals-discovery/);
});

test("QA parity A retains authoritative feeds and recovery states", () => {
  assert.match(deals, /getJSON<\{ products: Product\[\] \}>\("\/catalog\/products\?deals=active", controller\.signal\)/);
  assert.match(directory, /getJSON<StoreDirectoryPayload>\("\/catalog\/stores", controller\.signal\)/);
  assert.match(storePage, /getJSON<PublicStorePayload>\(`\/catalog\/stores\/\$\{slug\}`, controller\.signal\)/);
  for (const source of [deals, directory, storePage]) {
    assert.match(source, /"loading"/);
    assert.match(source, /"error"/);
    assert.match(source, /Retry|Try again/);
  }
});
