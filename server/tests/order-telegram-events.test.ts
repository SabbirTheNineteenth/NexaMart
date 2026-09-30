import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderCreatedEvent, buildOrderStatusUpdatedEvent } from "../src/modules/orders/order-telegram-events.js";

const base = { eventId: "11111111-1111-4111-8111-111111111111", occurredAt: "2026-09-30T00:00:00.000Z", orderId: "22222222-2222-4222-8222-222222222222", reference: "NX-TEST", paymentMethod: "cod" as const, paymentStatus: "unpaid" as const };

test("order-created Telegram event contains one minimal real order snapshot", () => {
  const payload = buildOrderCreatedEvent({ ...base, total: "350.00", status: "pending", items: [{ productName: "Cotton shirt", quantity: 2 }], shippingAddress: { phone: "private-phone", line1: "private-address" }, customerEmail: "private@example.test" });
  assert.deepEqual(payload, { eventId: base.eventId, eventType: "order.created", occurredAt: base.occurredAt, orderId: base.orderId, reference: base.reference, paymentMethod: "cod", paymentStatus: "unpaid", orderStatus: "pending", fulfillmentStatus: "pending", total: "350.00", currency: "BDT", items: [{ name: "Cotton shirt", quantity: 2 }] });
  assert.doesNotMatch(JSON.stringify(payload), /private-phone|private-address|private@example/);
});

test("status update uses stored status and validated note without claiming payment collection", () => {
  const payload = buildOrderStatusUpdatedEvent({ ...base, orderItemId: "33333333-3333-4333-8333-333333333333", itemName: "Cotton shirt", fulfillmentStatus: "processing", note: "Packing started", customerId: "private-customer-id" });
  assert.deepEqual(payload, { eventId: base.eventId, eventType: "order.status_updated", occurredAt: base.occurredAt, orderId: base.orderId, orderItemId: "33333333-3333-4333-8333-333333333333", reference: base.reference, paymentMethod: "cod", paymentStatus: "unpaid", fulfillmentStatus: "processing", itemName: "Cotton shirt", note: "Packing started" });
  assert.doesNotMatch(JSON.stringify(payload), /private-customer-id|collected/);
});
