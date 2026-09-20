import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");

test("catalog hides prior empty assertions while every new filter request is unsettled", () => {
  assert.match(
    storefront,
    /useEffect\(\(\) => \{\r?\n    const controller = new AbortController\(\);\r?\n    setCatalogLoaded\(false\);\r?\n    setError\(""\);[\s\S]*?getJSON<CatalogPayload>/,
  );
  assert.match(storefront, /catalogLoaded && !visibleProducts\.length/);
});

test("slug navigation never renders or mutates a prior product while the next slug is unresolved", () => {
  assert.match(detail, /const currentProduct = product\?\.slug === slug \? product : null;/);
  assert.match(detail, /if \(!currentProduct\) return <main className="product-detail-shell orchid-explore"><DetailHeader authenticated=\{cart\.authenticated\} totalItems=\{cart\.totalItems\} \/><section className="product-detail-state" aria-label="Product loading"><p className="seller-state" role="status">Loading product[^<]*<\/p><\/section><\/main>;/);
  assert.match(detail, /if \(!product \|\| product\.slug !== slug\) return;/);
});
