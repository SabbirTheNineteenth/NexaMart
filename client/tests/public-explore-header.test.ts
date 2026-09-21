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

test("EXPLORE-HEADER-02 keeps the shared header usable from desktop through narrow touch viewports", () => {
  const header = readFileSync(headerPath, "utf8");
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

  assert.match(header, /type="submit" aria-label="Search the marketplace"/);
  assert.match(header, /aria-expanded=\{mobileNavOpen\}/);
  assert.match(header, /aria-controls="explore-navigation"/);
  assert.match(header, /requestAnimationFrame\(\(\) => mobileToggleRef\.current\?\.focus\(\)\)/);
  assert.match(header, /<Menu size=\{18\} aria-hidden="true"\/>/);
  assert.match(header, /<Search size=\{17\} aria-hidden="true"\/>/);

  assert.match(styles, /\.marketplace-search-submit\{[^}]*min-width:44px[^}]*min-height:44px/);
  assert.match(styles, /\.explore-header\{overflow-x:clip/);
  assert.match(styles, /@media\(max-width:960px\)\{[^}]*\.explore-header \.marketplace-topbar\{[^}]*grid-template-columns:auto minmax\(0,1fr\) auto/);
  assert.match(styles, /@media\(max-width:700px\)\{[^}]*\.explore-header \.marketplace-utility\{display:none/);
  assert.match(styles, /@media\(max-width:420px\)\{[^}]*\.explore-header \.marketplace-brand>span\{display:none/);
  assert.match(styles, /@media\(max-width:390px\)\{[^}]*\.explore-header \.marketplace-topbar\{[^}]*gap:6px/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\.explore-header/);
});
