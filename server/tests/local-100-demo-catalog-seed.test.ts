import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CATALOG_SEED_PLAN } from "../src/db/seeds/demo-catalog-plan.js";
import { assertLocalDemoSeedGuard, runLocalDemoCatalogSeed, type LocalDemoCatalogSeedRepository } from "../src/db/seeds/runLocalDemoSeed.js";

const localEnvironment = { DATABASE_URL: "postgresql://demo:password@localhost:5432/nexamart", NEXAMART_DEMO_SEED: "local-confirmed" } as const;

test("local 100-product runner refuses production before any repository write", async () => {
  let writes = 0;
  const repository = fakeRepository(() => { writes += 1; });

  await assert.rejects(
    () => runLocalDemoCatalogSeed(repository, { ...localEnvironment, NODE_ENV: "production" }),
    /NODE_ENV=production/,
  );
  assert.equal(writes, 0);
});

test("local 100-product runner seeds namespaced seller, canonical taxonomy, published products, and an active deal idempotently", async () => {
  const calls: string[] = [];
  const repository = fakeRepository((call) => calls.push(call));

  const result = await runLocalDemoCatalogSeed(repository, localEnvironment);
  const repeatedResult = await runLocalDemoCatalogSeed(repository, localEnvironment);

  assert.deepEqual(result, { categoryCount: 10, productCount: 100, promotionCount: 1 });
  assert.deepEqual(repeatedResult, result);
  assert.equal(DEMO_CATALOG_SEED_PLAN.length, 100);
  assert.deepEqual(calls.slice(0, 4), ["seller", "categories:10", "subcategories:81", "brands:50"]);
  assert.equal(calls.filter((call) => call.startsWith("product:")).length, 200);
  assert.equal(calls.at(-1), "promotion:local-demo-catalog-demo-audio-01");
  assert.ok(calls.includes("product:local-demo-catalog-demo-audio-01:published"));
});

test("local seed guard accepts only exact localhost PostgreSQL hosts and does not disclose URLs", () => {
  assert.doesNotThrow(() => assertLocalDemoSeedGuard(localEnvironment));
  for (const databaseUrl of ["postgresql://demo:secret@localhost.evil/nexamart", "postgresql://demo:secret@[::1]/nexamart", "mysql://demo:secret@localhost/nexamart"]) {
    assert.throws(() => assertLocalDemoSeedGuard({ ...localEnvironment, DATABASE_URL: databaseUrl }), (error: Error) => !String(error).includes("secret") && !String(error).includes(databaseUrl));
  }
});

function fakeRepository(record: (call: string) => void): LocalDemoCatalogSeedRepository {
  return {
    async upsertSeller() { record("seller"); return "seller-id"; },
    async upsertCategories(values) { record(`categories:${values.length}`); return new Map(values.map((value) => [value.slug, `${value.slug}-id`])); },
    async upsertSubcategories(values) { record(`subcategories:${values.length}`); return new Map(values.map((value) => [`${value.categorySlug}/${value.slug}`, `${value.slug}-id`])); },
    async upsertBrands(values) { record(`brands:${values.length}`); return new Map(values.map((value) => [value.slug, `${value.slug}-id`])); },
    async upsertProduct(value) { record(`product:${value.slug}:${value.isPublished ? "published" : "hidden"}`); return `${value.slug}-id`; },
    async upsertPromotion(value) { record(`promotion:${value.productSlug}`); },
  };
}
