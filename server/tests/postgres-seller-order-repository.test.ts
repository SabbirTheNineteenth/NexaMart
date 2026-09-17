import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/orders/postgres-order.repository.ts", import.meta.url), "utf8");

test("seller order repository reads only seller-owned line management fields", () => {
  assert.match(source, /orderItemId: orderItems\.id/);
  assert.match(source, /productName: orderItems\.productName/);
  assert.match(source, /quantity: orderItems\.quantity/);
  assert.match(source, /fulfillmentStatus: orderItems\.fulfillmentStatus/);
  assert.match(source, /from\(orderItems\)[\s\S]*innerJoin\(orders, eq\(orderItems\.orderId, orders\.id\)\)[\s\S]*where\(eq\(orderItems\.sellerId, sellerId\)\)/);
  assert.match(source, /order\.items\.push\(\{ id: row\.orderItemId, productName: row\.productName, quantity: row\.quantity, fulfillmentStatus: row\.fulfillmentStatus \}\)/);
});

test("seller order repository keeps the feed line-scoped and does not expose customer or delivery data", () => {
  const sellerFeed = source.slice(source.indexOf("async listForSeller"));
  assert.doesNotMatch(sellerFeed, /customerId|shippingAddressSnapshot|accounts\.|paymentStatus|productImageUrl|unitPrice|variantSku|variantOptions/);
  assert.doesNotMatch(sellerFeed, /\.insert\(|\.update\(|\.delete\(/);
});