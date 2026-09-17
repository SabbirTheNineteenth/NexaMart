import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { orderEvents } from "../src/db/schema/index.js";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("order event schema and migration define a non-null per-order sequence with deterministic backfill", () => {
  const migration = read("../src/db/migrations/0016_order_event_sequence.sql");
  const sequence = orderEvents[Symbol.for("drizzle:Columns")].sequence as { notNull: boolean; dataType: string } | undefined;
  const extraConfigBuilder = orderEvents[Symbol.for("drizzle:ExtraConfigBuilder")] as (columns: unknown) => Array<{ config: { name: string; columns: Array<{ name: string }>; unique: boolean } }>;
  const uniqueSequence = extraConfigBuilder(orderEvents[Symbol.for("drizzle:ExtraConfigColumns")]).find(({ config }) => config.name === "order_events_order_sequence_unique");

  assert.equal(sequence?.dataType, "number");
  assert.equal(sequence?.notNull, true);
  assert.match(migration, /ADD COLUMN "sequence" integer/);
  assert.match(migration, /row_number\(\) OVER \(PARTITION BY "order_id" ORDER BY "created_at" ASC, "id" ASC\)/);
  assert.match(migration, /ALTER COLUMN "sequence" SET NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX "order_events_order_sequence_unique" ON "order_events" USING btree \("order_id","sequence"\)/);
  assert.deepEqual(uniqueSequence?.config.columns.map(({ name }) => name), ["order_id", "sequence"]);
  assert.equal(uniqueSequence?.config.unique, true);
});

test("checkout persists order-created first then fulfillment-pending events in inserted item order", () => {
  const repository = read("../src/modules/orders/postgres-order.repository.ts");

  assert.match(repository, /eventType: "order_created", toStatus: "pending", sequence: 1/);
  assert.match(repository, /insertedItems\.map\(\(item, index\) => \(\{ orderId: order\.id, orderItemId: item\.id, actorId: input\.customerId, eventType: "fulfillment_pending", toStatus: "pending", sequence: index \+ 2 \}\)\)/);
});

test("tracking reads persisted order events by sequence rather than timestamp", () => {
  const repository = read("../src/modules/orders/postgres-order.repository.ts");

  assert.match(repository, /orderBy\(asc\(orderEvents\.sequence\)\)/);
  assert.doesNotMatch(repository, /orderBy\(asc\(orderEvents\.createdAt\)\)/);
});

test("seller fulfillment keeps its item review lock and serializes event appends per order", () => {
  const service = read("../src/modules/seller/services/seller-fulfillment-service.ts");

  assert.match(service, /pg_advisory_xact_lock\(hashtext\(\$\{`review-order-item:\$\{input\.orderItemId\}`\}\)\)/);
  assert.match(service, /pg_advisory_xact_lock\(hashtext\(\$\{`order-event-sequence:\$\{current\.orderId\}`\}\)\)/);
  assert.match(service, /select coalesce\(max\("sequence"\), 0\) \+ 1 as "sequence" from "order_events" where "order_id" = \$\{updated\.orderId\}/);
  assert.match(service, /eventType: "fulfillment_updated", fromStatus: current\.fulfillmentStatus, toStatus: updated\.fulfillmentStatus, sequence: nextSequence/);
});
