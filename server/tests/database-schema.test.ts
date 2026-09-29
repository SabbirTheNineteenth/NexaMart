import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accounts, addresses, auditRecords, cartItems, commissionRecords, fulfillmentStatus, orderEvents, orderItems, orders, payoutRecords, productReviews, products, promotions, sellerProfiles } from "../src/db/schema/index.js";

test("database schema defines persistent commerce entities", () => {
  assert.equal(accounts[Symbol.for("drizzle:Name")], "accounts");
  assert.equal(products[Symbol.for("drizzle:Name")], "products");
  assert.equal(cartItems[Symbol.for("drizzle:Name")], "cart_items");
  assert.equal(orders[Symbol.for("drizzle:Name")], "orders");
  assert.equal(sellerProfiles[Symbol.for("drizzle:Name")], "seller_profiles");
  assert.equal(addresses[Symbol.for("drizzle:Name")], "addresses");
  assert.equal(productReviews[Symbol.for("drizzle:Name")], "product_reviews");
  assert.equal(commissionRecords[Symbol.for("drizzle:Name")], "commission_records");
  assert.equal(payoutRecords[Symbol.for("drizzle:Name")], "payout_records");
  assert.equal(promotions[Symbol.for("drizzle:Name")], "promotions");
  assert.equal(promotions.sellerId.name, "seller_id");
  assert.equal(promotions.startsAt.name, "starts_at");
  assert.equal(promotions.endsAt.name, "ends_at");
  assert.equal(orders.shippingAddressSnapshot.name, "shipping_address_snapshot");
  assert.equal(orderEvents[Symbol.for("drizzle:Name")], "order_events");
  assert.equal(auditRecords[Symbol.for("drizzle:Name")], "audit_records");
  assert.equal(auditRecords.actorId.name, "actor_id");
  assert.equal(auditRecords.metadata.name, "metadata");
  assert.equal(auditRecords.createdAt.name, "created_at");
  assert.equal(orderItems.sellerId.name, "seller_id");
  assert.equal(orderItems.fulfillmentStatus.name, "fulfillment_status");
  assert.deepEqual(fulfillmentStatus.enumValues, ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned", "failed_delivery", "return_requested"]);
});

test("packed fulfillment status has an additive, unapplied PostgreSQL migration boundary", () => {
  const migration = readFileSync(new URL("../src/db/migrations/0021_add_packed_fulfillment_status.sql", import.meta.url), "utf8");

  assert.match(migration, /Unapplied by design/);
  assert.match(migration, /ALTER TYPE "fulfillment_status" ADD VALUE IF NOT EXISTS 'packed' BEFORE 'shipped';/);
});
