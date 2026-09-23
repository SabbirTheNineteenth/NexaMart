import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

test("VISUAL-7/02 names the Explore landmark and keeps its data-bound browse hierarchy", () => {
  assert.match(storefront, /<main className="storefront customer-experience orchid-explore reference-explore-layout" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<header id="top" className="marketplace-header"/);
  assert.match(storefront, /<nav id="marketplace-category-navigation"[\s\S]*aria-label="Marketplace categories">/);
  assert.match(storefront, /<section className="marketplace-hero reference-collection-hero" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<section id="departments" className="department-showcase shell">/);
  assert.match(storefront, /<section id="collection" className="collection shell customer-collection reference-explore-content">/);
  assert.match(storefront, /taxonomy\.categories\.map/);
  assert.match(storefront, /selectUniqueProductsByImage\(newArrivals, 8\)/);
  assert.match(storefront, /newArrivalProducts\.map\(\(product\) => <DiscoveryProductCard/);
  assert.match(storefront, /taxonomy\.brands\.map/);
  assert.match(storefront, /const selectDepartment = \(departmentName: string\) => \{\r?\n    setCatalogLoaded\(false\);\r?\n    setCategory\(departmentName\);\r?\n    setSubcategory\(""\);\r?\n    setMobileNavOpen\(false\);\r?\n    scrollToCollection\(\);/);
});

test("VISUAL-7/02 keeps the first Browse surface informative while taxonomy or catalog data is unavailable", () => {
  assert.match(storefront, /taxonomyState === "error" \? <p className="taxonomy-state" role="alert">Unable to load departments\. <button type="button" onClick=\{\(\) => setTaxonomyReloadNonce\(\(value\) => value \+ 1\)\}>Retry departments<\/button><\/p>/);
  assert.match(storefront, /: !catalogLoaded \? <div className=\{styles\.skeletonGrid\} role="status" aria-label="Loading catalog"><SkeletonCard \/><SkeletonCard \/><SkeletonCard \/><span className="sr-only">Loading catalog products\. Results will appear here\.<\/span><\/div> : catalogLoaded && !visibleProducts\.length/);
});
