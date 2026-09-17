import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CATALOG } from "../src/scripts/demo-catalog.js";
import { seedDemoCatalog, validateDemoSeedEnvironment } from "../src/scripts/demo-seed.helpers.js";

test("demo catalog seed requires explicit non-production acknowledgement and a target store slug", () => {
  assert.throws(() => validateDemoSeedEnvironment({ NODE_ENV: "development", DEMO_SELLER_STORE_SLUG: "demo-store" }), /ALLOW_DEMO_SEED=true/);
  assert.throws(() => validateDemoSeedEnvironment({ ALLOW_DEMO_SEED: "true", NODE_ENV: "production", DEMO_SELLER_STORE_SLUG: "demo-store" }), /NODE_ENV=production/);
  assert.throws(() => validateDemoSeedEnvironment({ ALLOW_DEMO_SEED: "true", NODE_ENV: "development" }), /DEMO_SELLER_STORE_SLUG/);
  assert.equal(validateDemoSeedEnvironment({ ALLOW_DEMO_SEED: "true", NODE_ENV: "development", DEMO_SELLER_STORE_SLUG: " demo-store " }), "demo-store");
});

test("demo catalog seed rejects absent, inactive, or ambiguous target sellers without writing", async () => {
  const writes: string[] = [];
  const repository = {
    async findActiveSellersByStoreSlug() { return []; },
    async findProductsBySlugs() { return []; },
    async upsertCategories() { writes.push("categories"); return new Map(); },
    async upsertActiveBrands() { writes.push("brands"); return new Map(); },
    async upsertProduct() { writes.push("product"); },
  };

  await assert.rejects(() => seedDemoCatalog(repository, "demo-store", DEMO_CATALOG), /exactly one active seller/);
  assert.deepEqual(writes, []);
});

test("demo catalog seed ignores legacy foreign catalog slugs and writes only target-namespaced products", async () => {
  const categories = new Map([["audio", "category-audio"], ["electronics", "category-electronics"], ["home", "category-home"], ["outdoors", "category-outdoors"]]);
  const brands = new Map([["auralis", "brand-auralis"], ["vertex", "brand-vertex"], ["lumen", "brand-lumen"], ["northline", "brand-northline"]]);
  const products: Record<string, unknown>[] = [];
  const repository = {
    async findActiveSellersByStoreSlug() { return [{ accountId: "target-seller" }]; },
    async findProductsBySlugs(slugs: string[]) {
      assert.deepEqual(slugs, DEMO_CATALOG.map((product) => `demo-store-${product.slug}`));
      return [];
    },
    async upsertCategories() { return categories; },
    async upsertActiveBrands() { return brands; },
    async upsertProduct(input: Record<string, unknown>) { products.push(input); },
  };

  await seedDemoCatalog(repository, "demo-store", DEMO_CATALOG);

  assert.deepEqual(products.map((product) => product.slug), DEMO_CATALOG.map((product) => `demo-store-${product.slug}`));
  assert.deepEqual(products.map((product) => product.name), DEMO_CATALOG.map((product) => product.name));
  assert.deepEqual(products.map((product) => product.description), DEMO_CATALOG.map((product) => product.description));
  assert.deepEqual(products.map((product) => product.price), DEMO_CATALOG.map((product) => product.price));
  assert.deepEqual(products.map((product) => product.primaryImageUrl), DEMO_CATALOG.map((product) => product.primaryImageUrl));
  assert.deepEqual(products.map((product) => product.sellerId), Array(DEMO_CATALOG.length).fill("target-seller"));
});

test("demo catalog seed aborts before writes when a target-namespaced slug belongs to another seller", async () => {
  const writes: string[] = [];
  const repository = {
    async findActiveSellersByStoreSlug() { return [{ accountId: "target-seller" }]; },
    async findProductsBySlugs() { return [{ slug: `demo-store-${DEMO_CATALOG[0].slug}`, sellerId: "other-seller" }]; },
    async upsertCategories() { writes.push("categories"); return new Map(); },
    async upsertActiveBrands() { writes.push("brands"); return new Map(); },
    async upsertProduct() { writes.push("product"); },
  };

  await assert.rejects(() => seedDemoCatalog(repository, "demo-store", DEMO_CATALOG), /belongs to another seller/);
  assert.deepEqual(writes, []);
});

test("demo catalog seed writes target-namespaced records with canonical taxonomy and stable re-run keys", async () => {
  const categories = new Map([["audio", "category-audio"], ["electronics", "category-electronics"], ["home", "category-home"], ["outdoors", "category-outdoors"]]);
  const brands = new Map([["auralis", "brand-auralis"], ["vertex", "brand-vertex"], ["lumen", "brand-lumen"], ["northline", "brand-northline"]]);
  const products: Record<string, unknown>[] = [];
  let receivedCategories: unknown;
  let receivedBrands: unknown;
  const repository = {
    async findActiveSellersByStoreSlug(slug: string) { assert.equal(slug, "demo-store"); return [{ accountId: "target-seller" }]; },
    async findProductsBySlugs(slugs: string[]) { assert.deepEqual(slugs, DEMO_CATALOG.map((product) => `demo-store-${product.slug}`)); return slugs.map((slug) => ({ slug, sellerId: "target-seller" })); },
    async upsertCategories(input: unknown) { receivedCategories = input; return categories; },
    async upsertActiveBrands(input: unknown) { receivedBrands = input; return brands; },
    async upsertProduct(input: Record<string, unknown>) { products.push(input); },
  };

  const result = await seedDemoCatalog(repository, "demo-store", DEMO_CATALOG);

  assert.deepEqual(result, { categoryCount: 4, productCount: 8, sellerId: "target-seller" });
  assert.deepEqual(receivedCategories, [
    { name: "Audio", slug: "audio" }, { name: "Electronics", slug: "electronics" }, { name: "Home", slug: "home" }, { name: "Outdoors", slug: "outdoors" },
  ]);
  assert.deepEqual(receivedBrands, [
    { name: "Auralis", slug: "auralis" }, { name: "Vertex", slug: "vertex" }, { name: "Lumen", slug: "lumen" }, { name: "Northline", slug: "northline" },
  ]);
  assert.equal(products.length, 8);
  assert.deepEqual(products.map((product) => product.sellerId), Array(8).fill("target-seller"));
  assert.deepEqual(products.map((product) => product.slug), DEMO_CATALOG.map((product) => `demo-store-${product.slug}`));
  assert.equal(products[0].categoryId, "category-audio");
  assert.equal(products[0].brandId, "brand-auralis");
  assert.equal(products[0].isPublished, true);
});
