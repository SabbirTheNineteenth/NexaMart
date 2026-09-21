import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CATALOG_SEED_PLAN } from "../src/db/seeds/demo-catalog-plan.js";

test("demo catalog seed plan parses every image URL as an Unsplash source URL", () => {
  for (const product of DEMO_CATALOG_SEED_PLAN) {
    const imageUrl = new URL(product.imageUrl);
    assert.equal(imageUrl.protocol, "https:");
    assert.equal(imageUrl.hostname, "images.unsplash.com");
    assert.match(imageUrl.pathname, /^\/photo-/);
  }
});

test("demo catalog seed plan has the constrained display-only product shape", () => {
  for (const product of DEMO_CATALOG_SEED_PLAN) {
    assert.deepEqual(Object.keys(product).sort(), ["brand", "category", "id", "imageUrl", "name", "subcategory"]);
    assert.match(product.id, /^demo-[a-z0-9-]+$/);
    assert.ok(product.name.trim());
    assert.ok(product.brand.trim());
    assert.ok(product.category.trim());
    assert.ok(product.subcategory.trim());
  }
});

test("demo catalog seed plan has at least 100 deterministic, unique products", () => {
  assert.ok(DEMO_CATALOG_SEED_PLAN.length >= 100);
  assert.equal(new Set(DEMO_CATALOG_SEED_PLAN.map((product) => product.id)).size, DEMO_CATALOG_SEED_PLAN.length);
  assert.equal(new Set(DEMO_CATALOG_SEED_PLAN.map((product) => product.name)).size, DEMO_CATALOG_SEED_PLAN.length);
  assert.equal(new Set(DEMO_CATALOG_SEED_PLAN.map((product) => product.imageUrl)).size, DEMO_CATALOG_SEED_PLAN.length);
});

test("demo catalog seed plan uses a broad explicit category and subcategory taxonomy", () => {
  const categories = new Map<string, Set<string>>();
  for (const product of DEMO_CATALOG_SEED_PLAN) {
    const subcategories = categories.get(product.category) ?? new Set<string>();
    subcategories.add(product.subcategory);
    categories.set(product.category, subcategories);
  }

  assert.ok(categories.size >= 10);
  assert.ok([...categories.values()].every((subcategories) => subcategories.size >= 2));
  assert.ok(new Set(DEMO_CATALOG_SEED_PLAN.map((product) => product.brand)).size >= 20);
});
