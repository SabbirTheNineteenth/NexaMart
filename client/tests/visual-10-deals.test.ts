import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const deals = readFileSync(new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url), "utf8");
const exploreHeader = readFileSync(new URL("../src/components/ExploreHeader.tsx", import.meta.url), "utf8");

test("VISUAL-10/07 restores the shared Explore hierarchy with only existing navigation contracts", () => {
  assert.match(deals, /import \{ ExploreHeader \} from "@\/components\/ExploreHeader"/);
  assert.match(deals, /<ExploreHeader active="deals" \/>/);
  assert.match(exploreHeader, /<form className="marketplace-search" role="search" onSubmit=\{searchCatalog\}>/);
  assert.match(exploreHeader, /aria-label="Search the marketplace"/);
  assert.match(exploreHeader, /router\.push\(`\/\?q=\$\{encodeURIComponent\(searchQuery\.trim\(\)\)\}`\)/);
  assert.match(exploreHeader, /headerWishlistPath\(cart\.authenticated\)/);
  assert.match(exploreHeader, /href="\/\?bag=1" aria-label="Open shopping bag"/);
  assert.match(exploreHeader, /className=\{`marketplace-category-nav \$\{mobileNavOpen \? "is-open" : ""\}`\}/);
  assert.match(exploreHeader, /aria-label="Explore navigation"/);
  assert.match(exploreHeader, /aria-current=\{destination\.id === active \? "page" : undefined\}/);
});

test("VISUAL-10/07 keeps the deals canvas editorial, responsive, and fed only by active-deals records", () => {
  assert.match(deals, /<section className="marketplace-hero shell" aria-labelledby="deals-heading">/);
  assert.match(deals, /<div className="marketplace-hero-media">/);
  assert.match(deals, /<section id="deals-collection" className="collection shell customer-collection"/);
  assert.match(deals, /className="deals-results-frame marketplace-rail product-spotlight-rail"/);
  assert.match(deals, /getJSON<\{ products: Product\[\] \}>\("\/catalog\/products\?deals=active", controller\.signal\)/);
  assert.doesNotMatch(deals, /(?:countdown|remaining time|Save \$|Was \$|payment|delivery)/i);
  assert.doesNotMatch(deals, /(?:basePrice|originalPrice|discountPercent|promotion\.name)/);
});
