import assert from "node:assert/strict";
import test from "node:test";
import { customerOrderItemSummary, customerTrackingEmptyMessage, customerTrackingErrorMessage, customerTrackingTimelineEvents } from "../src/features/account/customer-order.utils";

test("customer order summary lists every purchased item", () => {
  assert.equal(customerOrderItemSummary([{ productId: "p-1", quantity: 2, unitPrice: 89 }, { productId: "p-2", quantity: 1, unitPrice: 15 }]), "3 items");
});

test("customer fulfillment timeline presents API events in their recorded order", () => {
  const timeline = customerTrackingTimelineEvents([
    { id: "event-1", orderItemId: "item-1", eventType: "fulfillment_updated", fromStatus: "processing", toStatus: "shipped", note: null, createdAt: "2026-09-12T00:00:00.000Z" },
    { id: "event-2", orderItemId: null, eventType: "order_created", fromStatus: null, toStatus: null, note: "Order received", createdAt: "2026-09-11T00:00:00.000Z" },
  ]);

  assert.deepEqual(timeline, [
    { id: "event-1", title: "Fulfillment updated", detail: "Processing → shipped", createdAt: "2026-09-12T00:00:00.000Z" },
    { id: "event-2", title: "Order created", detail: "Order received", createdAt: "2026-09-11T00:00:00.000Z" },
  ]);
});

test("customer fulfillment tracking has clear empty and failed-request states", () => {
  assert.equal(customerTrackingEmptyMessage(), "No fulfillment updates yet.");
  assert.equal(customerTrackingErrorMessage(new Error("Order not found")), "Order not found");
  assert.equal(customerTrackingErrorMessage(new DOMException("aborted", "AbortError")), "Unable to load fulfillment updates");
});
