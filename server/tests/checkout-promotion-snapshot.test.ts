import assert from "node:assert/strict";
import test from "node:test";
import { promotionSnapshotForOrderItem } from "../src/modules/orders/postgres-order.repository.js";

test("checkout leaves promotion snapshot empty for an ordinary catalog item", () => {
  assert.deepEqual(promotionSnapshotForOrderItem({ baseUnitPrice: 350 }), {});
});

test("checkout persists the full snapshot for an actually promoted item", () => {
  assert.deepEqual(promotionSnapshotForOrderItem({ baseUnitPrice: 350, promotionId: "promotion", promotionName: "Sale", discountPercent: 10 }), {
    baseUnitPrice: "350.00", promotionId: "promotion", promotionName: "Sale", discountPercent: "10.00",
  });
});
