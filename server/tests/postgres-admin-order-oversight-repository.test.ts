import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/admin/postgres-admin-order.repository.ts", import.meta.url), "utf8");

test("admin order oversight repository reads safe order, customer display, and immutable line snapshots", () => {
  assert.match(source, /from\(orders\)[\s\S]*innerJoin\(accounts, eq\(orders\.customerId, accounts\.id\)\)[\s\S]*orderBy\(desc\(orders\.createdAt\)\)/);
  assert.match(source, /customerName: accounts\.name/);
  assert.match(source, /from\(orderItems\)[\s\S]*where\(inArray\(orderItems\.orderId, orderIds\)\)/);
  assert.match(source, /sellerName: orderItems\.sellerName/);
  assert.match(source, /productName: orderItems\.productName/);
  assert.match(source, /productImageUrl: orderItems\.productImageUrl/);
  assert.match(source, /variantSku: orderItems\.variantSku/);
  assert.match(source, /variantOptions: orderItems\.variantOptions/);
  assert.match(source, /fulfillmentStatus: orderItems\.fulfillmentStatus/);
});

test("admin order oversight repository excludes private and mutable fulfillment data", () => {
  assert.doesNotMatch(source, /accounts\.email|passwordHash|shippingAddressSnapshot|orderEvents|\.insert\(|\.update\(|\.delete\(/);
});
