import assert from "node:assert/strict";
import test from "node:test";
import { products } from "../src/db/schema/index.js";

test("product schema persists a primary storefront image", () => {
  const table = products as unknown as { primaryImageUrl?: { name: string } };
  assert.equal(table.primaryImageUrl?.name, "primary_image_url");
});

test("product schema persists an optional brand without rewriting existing products", () => {
  const table = products as unknown as { brand?: { name: string; notNull: boolean } };
  assert.equal(table.brand?.name, "brand");
  assert.equal(table.brand?.notNull, false);
});
