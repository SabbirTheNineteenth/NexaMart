import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/admin/postgres-admin-promotion.repository.ts", import.meta.url), "utf8");

test("admin promotion oversight repository reads promotion configuration with safe product and seller displays", () => {
  assert.match(source, /from\(promotions\)[\s\S]*innerJoin\(accounts, eq\(promotions\.sellerId, accounts\.id\)\)[\s\S]*leftJoin\(products, eq\(promotions\.productId, products\.id\)\)[\s\S]*orderBy\(desc\(promotions\.createdAt\)\)/);
  assert.match(source, /promotionId: promotions\.id/);
  assert.match(source, /sellerName: accounts\.name/);
  assert.match(source, /productName: products\.name/);
  assert.match(source, /productImageUrl: products\.primaryImageUrl/);
  assert.match(source, /discountPercent: promotions\.discountPercent/);
  assert.match(source, /startsAt: promotions\.startsAt/);
  assert.match(source, /endsAt: promotions\.endsAt/);
  assert.match(source, /createdAt: promotions\.createdAt/);
});

test("admin promotion oversight repository is read-only and excludes sensitive account data", () => {
  assert.doesNotMatch(source, /accounts\.email|passwordHash|phone|\.insert\(|\.update\(|\.delete\(/);
});
