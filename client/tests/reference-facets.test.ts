import assert from "node:assert/strict";
import test from "node:test";
import { referenceFacetProducts } from "../src/features/catalog/reference-facets.js";

const product = (id: string, inStock: boolean, stocks: number[]) => ({ id, inStock, variants: stocks.map((stock, index) => ({ id: `${id}-${index}`, stock })) }) as never;

test("reference facets distinguish in-stock, low-stock, out-of-stock, standard, and variant products", () => {
  const products = [product("in", true, [9]), product("low", true, [2, 1]), product("out", false, [0])];
  assert.deepEqual(referenceFacetProducts(products, "in-stock", "all").map(({ id }) => id), ["in"]);
  assert.deepEqual(referenceFacetProducts(products, "low-stock", "variant-based").map(({ id }) => id), ["low"]);
  assert.deepEqual(referenceFacetProducts(products, "out-of-stock", "standard").map(({ id }) => id), ["out"]);
  assert.deepEqual(referenceFacetProducts([{ id: "legacy", inStock: true } as never], "in-stock", "standard").map(({ id }) => id), ["legacy"]);
});
