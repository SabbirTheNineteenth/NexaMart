import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const headerPath = new URL("../src/components/ExploreHeader.tsx", import.meta.url);
const dealRoute = new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url);
const directoryRoute = new URL("../src/features/catalog/StoreDirectory.tsx", import.meta.url);
const publicStoreRoute = new URL("../src/features/catalog/PublicStorePage.tsx", import.meta.url);

test("EXPLORE-HEADER-01 gives every public discovery route the contract-backed search, wishlist, account, and bag controls", () => {
  assert.equal(existsSync(headerPath), true, "public Explore routes should share one full marketplace header");
  const header = readFileSync(headerPath, "utf8");
  assert.match(header, /useCart\(\)/);
  assert.match(header, /headerWishlistPath\(cart\.authenticated\)/);
  assert.match(header, /href="\/\?bag=1"/);
  assert.match(header, /router\.push\(`\/\?q=\$\{encodeURIComponent\(searchQuery\.trim\(\)\)\}`\)/);
  assert.match(header, /aria-label="Toggle explore navigation"/);
  assert.match(header, /event\.key === "Escape"/);

  for (const route of [dealRoute, directoryRoute, publicStoreRoute]) {
    assert.match(readFileSync(route, "utf8"), /<ExploreHeader/);
  }
});
