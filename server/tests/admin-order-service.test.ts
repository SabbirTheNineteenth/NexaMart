import assert from "node:assert/strict";
import test from "node:test";
import { AdminOrderService } from "../src/modules/admin/services/admin-order-service.js";

const orders = [{
  id: "order-1", reference: "NX-ORDER-1", createdAt: "2026-09-11T00:00:00.000Z", status: "pending" as const, paymentStatus: "unpaid" as const, total: 129,
  customer: { id: "customer-1", name: "Sabbir" },
  items: [{ id: "item-1", seller: { id: "seller-1", name: "Bright Home" }, product: { id: "product-1", name: "Studio Lamp", imageUrl: null }, quantity: 1, unitPrice: 129, fulfillmentStatus: "pending" as const }],
}];

test("admin order service delegates its read-only operational feed to the repository", async () => {
  let calls = 0;
  const service = new AdminOrderService({ async list() { calls += 1; return orders; } });

  assert.deepEqual(await service.list(), orders);
  assert.equal(calls, 1);
});
