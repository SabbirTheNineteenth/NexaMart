import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const directory = readFileSync(new URL("../src/features/catalog/StoreDirectory.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/StoreDirectory.module.css", import.meta.url), "utf8");

test("VISUAL-10 stores directory keeps an Explore navigation hierarchy at every width", () => {
  assert.match(directory, /<a className="storefront-skip-link" href="#stores-heading">Skip to stores<\/a>/);
  assert.match(directory, /<header className="store-page-header deals-topbar">/);
  assert.match(directory, /<nav aria-label="Marketplace">/);
  assert.match(directory, /<Link href="\/">Shop<\/Link>/);
  assert.match(directory, /<Link href="\/deals">Deals<\/Link>/);
  assert.match(directory, /<Link aria-current="page" href="\/stores">Stores<\/Link>/);
  assert.match(directory, /<Link href="\/account">Account<\/Link>/);
});

test("VISUAL-10 store cards are dense, link only to verified public stores, and use returned fields", () => {
  assert.match(directory, /type StoreDirectoryPayload = \{ stores: PublicStore\[\] \}/);
  assert.match(directory, /getJSON<StoreDirectoryPayload>\("\/catalog\/stores", controller\.signal\)/);
  assert.match(directory, /store-directory-grid \$\{styles\.resultsGrid\}/);
  assert.match(directory, /store-directory-card \$\{styles\.storeCard\}/);
  assert.match(directory, /store\.productCount/);
  assert.match(directory, /store\.description/);
  assert.match(directory, /href=\{`\/stores\/\$\{store\.storeSlug\}`\}/);
  assert.doesNotMatch(directory, /rating|review|delivery|shipping|payment/i);
});

test("VISUAL-10 store directory exposes loading, empty, error, and retry feedback", () => {
  assert.match(directory, /role="status" aria-live="polite">Loading stores…/);
  assert.match(directory, /role="alert"/);
  assert.match(directory, /Stores are temporarily unavailable\./);
  assert.match(directory, /Retry stores/);
  assert.match(directory, /aria-busy=\{state === "loading"\}/);
  assert.match(directory, /No stores are available right now\./);
  assert.match(directory, /setReloadNonce\(\(value\) => value \+ 1\)/);
});

test("C08 keeps a single authoritative store as a compact panel rather than stretching the directory row", () => {
  assert.match(styles, /\.resultsGrid\{[^}]*justify-content:start/);
  assert.match(styles, /\.storeCard\{[^}]*max-width:320px/);
});
