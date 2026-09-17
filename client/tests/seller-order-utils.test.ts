import assert from "node:assert/strict";
import test from "node:test";
import { orderItemSummary } from "../src/features/seller/seller-order.utils";

test("seller order summary preserves every owned product quantity", () => {
  assert.equal(orderItemSummary([{ productName: "Studio Lamp", quantity: 2 }, { productName: "Desk Chair", quantity: 1 }]), "Studio Lamp ×2 · Desk Chair ×1");
});
