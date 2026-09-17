import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

test("catalog retry starts a new request without changing the search query", () => {
  assert.match(storefront, /const \[reloadNonce, setReloadNonce\] = useState\(0\);/);
  assert.match(storefront, /\}, \[query, category, subcategory, brand, sort, reloadNonce\]\);/);
  assert.match(storefront, /onClick=\{\(\) => setReloadNonce\(\(value\) => value \+ 1\)\}/);
});
