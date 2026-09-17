import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const sourcePath = new URL("../src/modules/seller/postgres-seller-review.repository.ts", import.meta.url);

test("seller review repository reads only reviews for products owned by the session seller with a safe projection", async () => {
  const source = await readFile(sourcePath, "utf8");

  assert.match(source, /innerJoin\(products, eq\(productReviews\.productId, products\.id\)\)/);
  assert.match(source, /where\(eq\(products\.sellerId, sellerId\)\)/);
  assert.match(source, /product: \{ id: products\.id, name: products\.name \}/);
  assert.match(source, /rating: productReviews\.rating/);
  assert.match(source, /title: productReviews\.title/);
  assert.match(source, /body: productReviews\.body/);
  assert.match(source, /createdAt: productReviews\.createdAt/);
  assert.match(source, /isVisible: productReviews\.isVisible/);
  assert.doesNotMatch(source, /accounts\.|addresses\.|password/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.delete\(/);
});
