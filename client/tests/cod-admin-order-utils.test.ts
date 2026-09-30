import assert from "node:assert/strict";
import test from "node:test";
import { codOrderStatusLabel, nextCodDeliveryActions } from "../src/features/admin/cod-order.utils";

test("Admin order labels distinguish approval and rejection", () => {
  assert.equal(codOrderStatusLabel("pending"), "Awaiting Admin approval");
  assert.equal(codOrderStatusLabel("confirmed"), "Approved for delivery");
  assert.equal(codOrderStatusLabel("cancelled"), "Rejected / cancelled");
});

test("delivery controls offer only lifecycle next steps", () => {
  assert.deepEqual(nextCodDeliveryActions("pending"), ["processing"]);
  assert.deepEqual(nextCodDeliveryActions("processing"), ["packed"]);
  assert.deepEqual(nextCodDeliveryActions("packed"), ["shipped"]);
  assert.deepEqual(nextCodDeliveryActions("shipped"), ["delivered", "failed_delivery"]);
  assert.deepEqual(nextCodDeliveryActions("delivered"), []);
  assert.deepEqual(nextCodDeliveryActions("failed_delivery"), ["return_requested"]);
  assert.deepEqual(nextCodDeliveryActions("return_requested"), ["returned"]);
});
