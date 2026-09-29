import assert from "node:assert/strict";
import test from "node:test";
import { allCodLinesCollected, canActOnCodLine, codTransitionAllowed, createCodEventPayload, postCodWebhook, signCodWebhook, verifyCodWebhook } from "../src/modules/orders/cod.js";

test("COD transitions are explicit and delivery collection cannot skip dispatch", () => {
  assert.equal(codTransitionAllowed("pending", "processing"), true);
  assert.equal(codTransitionAllowed("processing", "packed"), true);
  assert.equal(codTransitionAllowed("packed", "shipped"), true);
  assert.equal(codTransitionAllowed("shipped", "delivered"), true);
  assert.equal(codTransitionAllowed("shipped", "failed_delivery"), true);
  assert.equal(codTransitionAllowed("failed_delivery", "return_requested"), true);
  assert.equal(codTransitionAllowed("return_requested", "returned"), true);
  assert.equal(codTransitionAllowed("pending", "delivered"), false);
  assert.equal(codTransitionAllowed("delivered", "returned"), false);
});

test("outbound event contains only operational fields", () => {
  const payload = createCodEventPayload({ eventId: "event-1", eventType: "cod.order.created", occurredAt: "2026-09-29T00:00:00.000Z", orderId: "order-1", reference: "NX-1", sellerId: "seller-1", amount: "10.00", status: "pending", paymentStatus: "unpaid" });
  assert.deepEqual(Object.keys(payload).sort(), ["amount", "currency", "eventId", "eventType", "occurredAt", "orderId", "orderStatus", "paymentMethod", "paymentStatus", "reference", "sellerId"].sort());
  assert.equal(payload.paymentMethod, "cod");
});

test("webhook signature checks raw body and replay window", () => {
  const secret = "a".repeat(32); const body = '{"eventId":"e"}'; const timestamp = 1000;
  const signature = signCodWebhook(secret, timestamp, body);
  assert.equal(verifyCodWebhook(secret, timestamp, body, signature, timestamp + 100), true);
  assert.equal(verifyCodWebhook(secret, timestamp, body + " ", signature, timestamp + 100), false);
  assert.equal(verifyCodWebhook(secret, timestamp, body, signature, timestamp + 301), false);
});

test("seller ownership is line-scoped while admin has global authority", () => {
  assert.equal(canActOnCodLine("seller", "seller-a", "seller-a"), true);
  assert.equal(canActOnCodLine("seller", "seller-a", "seller-b"), false);
  assert.equal(canActOnCodLine("admin", "admin-a", "seller-b"), true);
});

test("order collection requires every line to be delivered with collection evidence", () => {
  const collectedAt = new Date("2026-09-29T00:00:00.000Z");
  assert.equal(allCodLinesCollected([{ status: "delivered", collectedAt }, { status: "shipped", collectedAt: null }]), false);
  assert.equal(allCodLinesCollected([{ status: "delivered", collectedAt }, { status: "delivered", collectedAt }]), true);
  assert.equal(allCodLinesCollected([]), false);
});

test("outbound transport sends signed minimal JSON without a live n8n service", async () => {
  const payload = { eventId: "event-1", eventType: "cod.order.created" };
  let request: { url: string; init: RequestInit } | undefined;
  await postCodWebhook("http://localhost:5678/webhook/nexamart-cod", "a".repeat(32), payload, (async (url, init) => { request = { url: String(url), init: init! }; return new Response(null, { status: 200 }); }) as typeof fetch, 1000);
  assert.equal(request?.url, "http://localhost:5678/webhook/nexamart-cod");
  assert.equal(request?.init.body, JSON.stringify(payload));
  assert.equal((request?.init.headers as Record<string, string>)["x-nexamart-signature"], signCodWebhook("a".repeat(32), 1000, JSON.stringify(payload)));
});
