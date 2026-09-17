import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CATALOG, canSeedDemoCatalog } from "../src/scripts/demo-catalog.js";

test("demo catalog has stable unique slugs, brands, and production image URLs across categories", () => {
  assert.ok(DEMO_CATALOG.length >= 8);
  assert.equal(new Set(DEMO_CATALOG.map((product) => product.slug)).size, DEMO_CATALOG.length);
  assert.ok(new Set(DEMO_CATALOG.map((product) => product.category.slug)).size >= 3);
  for (const product of DEMO_CATALOG) {
    assert.ok(product.brand.trim());
    const image = new URL(product.primaryImageUrl);
    assert.equal(image.hostname, "images.unsplash.com");
    assert.ok(image.searchParams.has("w"));
    assert.ok(image.searchParams.has("fit"));
  }
});

test("demo catalog seed requires an explicit environment acknowledgement", () => {
  assert.equal(canSeedDemoCatalog(undefined), false);
  assert.equal(canSeedDemoCatalog("false"), false);
  assert.equal(canSeedDemoCatalog("true"), true);
});
