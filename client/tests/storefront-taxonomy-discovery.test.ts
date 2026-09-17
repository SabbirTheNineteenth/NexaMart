import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildCatalogDiscoveryPath, catalogDiscoveryFacets, type CatalogTaxonomy } from "../src/features/catalog/catalog-discovery.js";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

const taxonomy: CatalogTaxonomy = {
  categories: [{ id: "cat-audio", name: "Audio & Speakers", slug: "audio-speakers" }, { id: "cat-home", name: "Home", slug: "home" }],
  subcategories: [{ id: "sub-headphones", categoryId: "cat-audio", name: "Headphones", slug: "headphones" }],
  brands: [{ id: "brand-nexa", name: "Nexa Audio", slug: "nexa-audio" }],
};

test("catalog discovery uses canonical category names with public query keys", () => {
  assert.equal(
    buildCatalogDiscoveryPath({ query: "wireless buds", categoryName: "Audio & Speakers", subcategorySlug: "headphones", brandSlug: "nexa-audio" }),
    "/catalog/products?q=wireless+buds&category=Audio+%26+Speakers&subcategory=headphones&brand=nexa-audio",
  );
});

test("catalog discovery omits unset filters without a trailing query separator", () => {
  assert.equal(buildCatalogDiscoveryPath({ query: "", categoryName: "", subcategorySlug: "", brandSlug: "" }), "/catalog/products");
});

test("dependent subcategories and applied facets follow the selected category", () => {
  assert.deepEqual(catalogDiscoveryFacets(taxonomy, { query: "", categoryName: "Audio & Speakers", subcategorySlug: "headphones", brandSlug: "nexa-audio" }), {
    subcategories: taxonomy.subcategories,
    applied: ["Audio & Speakers", "Headphones", "Nexa Audio"],
  });
  assert.deepEqual(catalogDiscoveryFacets(taxonomy, { query: "", categoryName: "Home", subcategorySlug: "headphones", brandSlug: "" }).subcategories, []);
});

test("storefront fetches taxonomy independently and protects both requests from stale updates", () => {
  assert.match(storefront, /getJSON<CatalogTaxonomy>\("\/catalog\/taxonomy", taxonomyController\.signal\)/);
  assert.match(storefront, /getJSON<CatalogPayload>\(buildCatalogDiscoveryPath\(/);
  assert.match(storefront, /const taxonomyController = new AbortController\(\);/);
  assert.match(storefront, /return \(\) => taxonomyController\.abort\(\);/);
  assert.match(storefront, /return \(\) => controller\.abort\(\);/);
});

test("storefront exposes category-first browse, dependent controls, brands, and clearable facets", () => {
  assert.match(storefront, /aria-label="Browse departments"/);
  assert.match(storefront, /aria-label="Subcategory"/);
  assert.match(storefront, /disabled=\{!category\}/);
  assert.match(storefront, /aria-label="Discover brands"/);
  assert.match(storefront, /Applied filters/);
  assert.match(storefront, /Clear all filters/);
  assert.match(storefront, /setSubcategory\(""\);\s*setBrand\(""\);/);
});

test("taxonomy has its own accessible loading, error retry, and empty states", () => {
  assert.match(storefront, /Loading departments…/);
  assert.match(storefront, /Unable to load departments\./);
  assert.match(storefront, /Retry departments/);
  assert.match(storefront, /No departments are available right now\./);
  assert.match(styles, /\.taxonomy-discovery\{/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*\.department-rail/);
});
