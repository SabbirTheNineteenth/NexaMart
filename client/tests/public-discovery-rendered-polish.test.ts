import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const deals = read("../src/features/catalog/DealsDiscovery.tsx");
const dealsCss = read("../src/features/catalog/DealsDiscovery.module.css");
const directory = read("../src/features/catalog/StoreDirectory.tsx");
const directoryCss = read("../src/features/catalog/StoreDirectory.module.css");
const store = read("../src/features/catalog/PublicStorePage.tsx");
const storeCss = read("../src/features/catalog/PublicStorePage.module.css");

test("public discovery routes keep each server-backed outcome actionable and announced", () => {
  assert.match(deals, /Loading active deals\.\.\./);
  assert.match(deals, /No active deals are available right now\./);
  assert.match(deals, /Retry active deals/);
  assert.match(directory, /Loading stores…/);
  assert.match(directory, /No stores are available right now\./);
  assert.match(directory, /No stores match your search\./);
  assert.match(directory, /Retry stores/);
  assert.match(store, /Loading store…/);
  assert.match(store, /Store unavailable/);
  assert.match(store, /No products are available from this store right now\./);
  assert.match(store, /Retry store/);
});

test("public discovery controls have local focus, 44px targets, and narrow containment", () => {
  for (const css of [dealsCss, directoryCss, storeCss]) {
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /max-width:\s*390px/);
    assert.match(css, /min-width:\s*0/);
  }
});

test("public store discards an aborted response before changing route state", () => {
  assert.match(store, /if \(controller\.signal\.aborted\) return;/);
});
