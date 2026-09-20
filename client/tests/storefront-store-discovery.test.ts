import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const storeDirectory = readFileSync(new URL("../src/features/catalog/StoreDirectory.tsx", import.meta.url), "utf8");
const storePage = readFileSync(new URL("../src/features/catalog/PublicStorePage.tsx", import.meta.url), "utf8");
const catalogTypes = readFileSync(new URL("../src/types/catalog.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("new arrivals request the real newest catalog order and credit available stores", () => {
  assert.match(storefront, /getJSON<CatalogPayload>\("\/catalog\/products\?sort=newest",/);
  assert.match(storefront, /New arrivals/);
  assert.match(storefront, /product\.storeName && product\.storeSlug/);
  assert.match(storefront, /href=\{`\/stores\/\$\{product\.storeSlug\}`\}/);
  assert.match(catalogTypes, /storeName\?: string/);
  assert.match(catalogTypes, /storeSlug\?: string/);
});

test("new arrivals have accessible loading, empty, error, and retry states", () => {
  assert.match(storefront, /Loading new arrivals…/);
  assert.match(storefront, /New arrivals are temporarily unavailable\./);
  assert.match(storefront, /No new arrivals are available right now\./);
  assert.match(storefront, /Retry new arrivals/);
  assert.match(storefront, /newArrivalsReloadNonce/);
});

test("public stores directory uses the verified catalog stores contract with recovery states", () => {
  assert.match(storeDirectory, /getJSON<StoreDirectoryPayload>\("\/catalog\/stores",/);
  assert.match(storeDirectory, /Loading stores…/);
  assert.match(storeDirectory, /Stores are temporarily unavailable\./);
  assert.match(storeDirectory, /No stores are available right now\./);
  assert.match(storeDirectory, /Retry stores/);
  assert.match(storeDirectory, /<Link href=\{`\/stores\/\$\{store\.storeSlug\}`\}/);
});

test("public store pages load the verified slug contract and retain safe error recovery", () => {
  assert.match(storePage, new RegExp("getJSON<PublicStorePayload>\\(`\\/catalog\\/stores\\/\\$\\{slug\\}`"));
  assert.match(storePage, /Loading store…/);
  assert.match(storePage, /Store unavailable/);
  assert.match(storePage, /Try again/);
  assert.match(storePage, /<Link href=\{`\/products\/\$\{product\.slug\}`\}/);
  assert.match(storePage, /storeReloadNonce/);
});

test("PARITY-C09 keeps every public-store state inside the compact Explore frame", () => {
  assert.match(storePage, /import styles from "\.\/PublicStorePage\.module\.css";/);
  assert.match(storePage, /className=\{styles\.stateFrame\}/);
  assert.match(storePage, /<p className=\{styles\.context\}>01 \/ Store collection<\/p>/);
  assert.match(storePage, /className=\{styles\.collection\} aria-busy=\{state === "loading"\}/);
  assert.match(storePage, /className=\{styles\.productGrid\}/);
});

test("store discovery remains responsive and uses dedicated marketplace styling", () => {
  assert.match(styles, /\.store-directory/);
  assert.match(styles, /\.public-store-page/);
  assert.match(styles, /\.new-arrivals/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*\.store-directory/);
});
