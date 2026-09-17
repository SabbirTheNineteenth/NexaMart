import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

test("a successfully loaded empty catalog announces a collection empty state", () => {
  assert.match(storefront, /const \[catalogLoaded, setCatalogLoaded\] = useState\(false\);/);
  assert.match(storefront, /setCatalog\(payload\);\n        setCatalogLoaded\(true\);/);
  assert.match(storefront, /catalogLoaded && !catalog\.products\.length/);
  assert.match(storefront, /role="status" aria-live="polite"/);
  assert.match(storefront, /No catalog products are available\./);
});

test("an active catalog search or category uses a no-results message instead", () => {
  assert.match(storefront, /const hasActiveCatalogFilter = Boolean\(query\.trim\(\) \|\| category \|\| subcategory \|\| brand\);/);
  assert.match(storefront, /hasActiveCatalogFilter \? "No matching products\." : "No catalog products are available\."/);
});
