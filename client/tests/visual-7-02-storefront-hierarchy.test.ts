import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

test("VISUAL-7/02 names the Explore landmark and keeps its data-bound browse hierarchy", () => {
  assert.match(storefront, /<main className="storefront customer-experience orchid-explore" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<header id="top" className="marketplace-header"/);
  assert.match(storefront, /<nav id="marketplace-category-navigation"[\s\S]*aria-label="Marketplace categories">/);
  assert.match(storefront, /<section className="marketplace-hero shell" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<section id="departments" className="department-showcase shell">/);
  assert.match(storefront, /<section id="collection" className="collection shell customer-collection">/);
  assert.match(storefront, /taxonomy\.categories\.map/);
  assert.match(storefront, /newArrivals\.slice\(0, 8\)\.map/);
  assert.match(storefront, /taxonomy\.brands\.map/);
  assert.match(storefront, /const selectDepartment = \(departmentName: string\) => \{\n    setCatalogLoaded\(false\);\n    setCategory\(departmentName\);\n    setSubcategory\(""\);\n    setMobileNavOpen\(false\);/);
});

test("VISUAL-7/02 keeps the first Browse surface informative while taxonomy or catalog data is unavailable", () => {
  assert.match(storefront, /taxonomyState === "error" \? <p className="taxonomy-state" role="alert">Unable to load departments\. <button type="button" onClick=\{\(\) => setTaxonomyReloadNonce\(\(value\) => value \+ 1\)\}>Retry departments<\/button><\/p>/);
  assert.match(storefront, /: !catalogLoaded \? <p className="marketplace-load-state" role="status">Loading catalog products[^<]*<\/p> : catalogLoaded && !catalog\.products\.length/);
});
