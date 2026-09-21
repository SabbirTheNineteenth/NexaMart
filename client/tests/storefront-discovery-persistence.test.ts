import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { catalogFiltersFromSearchParams, catalogFiltersToSearchParams, buildCatalogDiscoveryPath, type CatalogDiscoveryFilters } from "../src/features/catalog/catalog-discovery.js";
import { addRecentlyViewedProduct, removeRecentlyViewedProduct, type RecentlyViewedProduct } from "../src/features/catalog/recently-viewed.js";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");

const filters: CatalogDiscoveryFilters = { query: "desk lamp", categoryName: "Home", subcategorySlug: "lighting", brandSlug: "nexa", sort: "newest" };

test("catalog discovery round-trips supported filter and newest-sort state through the URL", () => {
  assert.deepEqual(catalogFiltersFromSearchParams(new URLSearchParams("q=desk+lamp&category=Home&subcategory=lighting&brand=nexa&sort=newest")), filters);
  assert.equal(catalogFiltersToSearchParams(filters).toString(), "q=desk+lamp&category=Home&subcategory=lighting&brand=nexa&sort=newest");
  assert.equal(buildCatalogDiscoveryPath(filters), "/catalog/products?q=desk+lamp&category=Home&subcategory=lighting&brand=nexa&sort=newest");
});

test("catalog discovery rejects untruthful sort values and leaves unrelated URL state intact", () => {
  assert.equal(catalogFiltersFromSearchParams(new URLSearchParams("sort=price")).sort, "");
  assert.equal(catalogFiltersToSearchParams({ ...filters, query: "", sort: "" }, new URLSearchParams("bag=1")).toString(), "bag=1&category=Home&subcategory=lighting&brand=nexa");
});

test("recently viewed products are browser-local, de-duplicated, bounded, and removable", () => {
  const lamp: RecentlyViewedProduct = { id: "lamp", slug: "lamp", name: "Lamp", image: "lamp.jpg", price: 20 };
  const chair: RecentlyViewedProduct = { id: "chair", slug: "chair", name: "Chair", image: "chair.jpg", price: 40 };
  assert.deepEqual(addRecentlyViewedProduct([lamp], chair, 2), [chair, lamp]);
  assert.deepEqual(addRecentlyViewedProduct([chair, lamp], lamp, 2), [lamp, chair]);
  assert.deepEqual(removeRecentlyViewedProduct([lamp, chair], "lamp"), [chair]);
});

test("storefront synchronizes filters with URL and leaves browser-local history tracking to product detail", () => {
  assert.match(storefront, /usePathname, useRouter, useSearchParams/);
  assert.match(storefront, /router\.replace\(/);
  assert.match(storefront, /aria-label="Sort catalog"/);
  assert.match(storefront, /<option value="newest">Newest arrivals<\/option>/);
  assert.doesNotMatch(storefront, /Recently viewed|Saved in this browser|recently-viewed/);
  assert.match(storefront, /setBrand\(""\); setSort\(""\);/);
  assert.match(detail, /recordRecentlyViewedProduct\(detail\.product\)/);
});

test("C01 omits browser-local history from the storefront while retaining detail tracking", () => {
  assert.doesNotMatch(storefront, /reference-recently-viewed|recently-viewed-thumb/);
  assert.match(detail, /recordRecentlyViewedProduct\(detail\.product\)/);
});
