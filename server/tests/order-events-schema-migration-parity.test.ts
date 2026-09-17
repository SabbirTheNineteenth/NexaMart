import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { orderEvents } from "../src/db/schema/index.js";

test("order events schema index matches the applied non-unique migration index", () => {
  const migration = readFileSync(new URL("../src/db/migrations/0007_order_fulfillment_snapshots.sql", import.meta.url), "utf8");
  const migrationIndex = migration.match(/CREATE (UNIQUE )?INDEX "(order_events_order_created_at_index)" ON "order_events" USING btree \("order_id","created_at"\)/);

  assert.ok(migrationIndex, "applied migration must define the order events index");
  assert.equal(migrationIndex[1], undefined, "applied migration index must be non-unique");

  const extraConfigBuilder = orderEvents[Symbol.for("drizzle:ExtraConfigBuilder")] as (columns: unknown) => Array<{ config: { name: string; columns: Array<{ name: string }>; unique: boolean } }>;
  const extraConfigColumns = orderEvents[Symbol.for("drizzle:ExtraConfigColumns")];
  const schemaIndex = extraConfigBuilder(extraConfigColumns).find(({ config }) => config.name === migrationIndex[2]);

  assert.ok(schemaIndex, "schema must define the applied order events index");
  assert.deepEqual(schemaIndex.config.columns.map(({ name }) => name), ["order_id", "created_at"]);
  assert.equal(schemaIndex.config.unique, false);
});
