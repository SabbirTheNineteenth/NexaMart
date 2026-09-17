import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/admin/admin.repository.ts", import.meta.url), "utf8");
const productSource = source.slice(source.indexOf("async listProducts"), source.indexOf("async listOrders"));

test("admin product oversight reads every product with category and seller display context", () => {
  assert.match(productSource, /from\(products\)[\s\S]*leftJoin\(categories, eq\(products\.categoryId, categories\.id\)\)[\s\S]*leftJoin\(accounts, eq\(products\.sellerId, accounts\.id\)\)[\s\S]*leftJoin\(sellerProfiles, eq\(accounts\.id, sellerProfiles\.accountId\)\)[\s\S]*orderBy\(desc\(products\.createdAt\)\)/);
  assert.match(productSource, /slug: products\.slug/);
  assert.match(productSource, /primaryImageUrl: products\.primaryImageUrl/);
  assert.match(productSource, /price: products\.price/);
  assert.match(productSource, /categoryId: categories\.id/);
  assert.match(productSource, /categoryName: categories\.name/);
  assert.match(productSource, /categorySlug: categories\.slug/);
  assert.match(productSource, /sellerStoreName: sellerProfiles\.storeName/);
  assert.match(productSource, /sellerStoreSlug: sellerProfiles\.storeSlug/);
  assert.match(productSource, /sellerStatus: sellerProfiles\.status/);
  assert.match(productSource, /updatedAt: products\.updatedAt/);
  assert.match(productSource, /expectedRevision: sql<string>`to_char\(\$\{products\.updatedAt\}, 'YYYY-MM-DD"T"HH24:MI:SS\.USOF'\)`/);
  assert.match(productSource, /expectedRevision: row\.expectedRevision,/);
});

test("admin product oversight projects marketplace-safe fields and remains read-only", () => {
  assert.doesNotMatch(productSource, /passwordHash|accounts\.email|\.insert\(\s*products\s*\)|\.update\(\s*products\s*\)|\.delete\(\s*products\s*\)/);
});

test("admin product oversight projects ordered revision content without child identifiers", () => {
  assert.match(productSource, /description: products\.description/);
  assert.match(productSource, /colors: products\.colors/);
  assert.match(productSource, /from\(productGalleryImages\)\.where\(eq\(productGalleryImages\.productId, row\.id\)\)\.orderBy\(asc\(productGalleryImages\.sortOrder\)\)/);
  assert.match(productSource, /imageUrl: productGalleryImages\.imageUrl, altText: productGalleryImages\.altText, sortOrder: productGalleryImages\.sortOrder/);
  assert.match(productSource, /from\(productVariants\)\.where\(eq\(productVariants\.productId, row\.id\)\)\.orderBy\(asc\(productVariants\.sku\)\)/);
  assert.match(productSource, /sku: productVariants\.sku, options: productVariants\.options, price: productVariants\.price, stock: productVariants\.stock/);
  assert.doesNotMatch(productSource, /id: productGalleryImages\.id|productId: productGalleryImages\.productId|id: productVariants\.id|productId: productVariants\.productId/);
});

test("admin product oversight requires the exact database revision token", () => {
  const types = readFileSync(new URL("../src/modules/admin/admin.types.ts", import.meta.url), "utf8");
  assert.match(types, /expectedRevision: string;/);
  assert.doesNotMatch(types, /expectedRevision\?: string;/);
});
