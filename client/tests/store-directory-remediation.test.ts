import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const directory = readFileSync(new URL("../src/features/catalog/StoreDirectory.tsx", import.meta.url), "utf8");
const directoryStyles = readFileSync(new URL("../src/features/catalog/StoreDirectory.module.css", import.meta.url), "utf8");
const storePage = readFileSync(new URL("../src/features/catalog/PublicStorePage.tsx", import.meta.url), "utf8");
const storeStyles = readFileSync(new URL("../src/features/catalog/PublicStorePage.module.css", import.meta.url), "utf8");

test("store discovery supplies a real local search and clear control without expanding the store contract", () => {
  assert.match(directory, /const \[query, setQuery\] = useState\(""\)/);
  assert.match(directory, /aria-label="Search stores"/);
  assert.match(directory, /value=\{query\}/);
  assert.match(directory, /setQuery\(event\.target\.value\)/);
  assert.match(directory, /visibleStores/);
  assert.match(directory, /Clear search/);
  assert.match(directory, /No stores match your search\./);
  assert.match(directory, /href=\{`\/stores\/\$\{store\.storeSlug\}`\}/);
  assert.doesNotMatch(directory, /rating|delivery|inventory/i);
});

test("store routes keep navigable recovery states and compact motion-safe layout affordances", () => {
  assert.match(directory, /aria-live="polite"/);
  assert.match(directory, /Retry stores/);
  assert.match(storePage, /Skip to store products/);
  assert.match(storePage, /Retry store/);
  assert.match(storePage, /Back to stores/);
  assert.match(directoryStyles, /:focus-visible/);
  assert.match(storeStyles, /:focus-visible/);
  assert.match(directoryStyles, /prefers-reduced-motion: reduce/);
  assert.match(storeStyles, /prefers-reduced-motion: reduce/);
  assert.match(directoryStyles, /max-width:\s*420px/);
  assert.match(storeStyles, /max-width:\s*420px/);
});
