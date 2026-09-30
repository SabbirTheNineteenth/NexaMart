import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { auditRecords, codOutbox, orderEvents, orderItems, orders, serviceAuditRecords } from "../src/db/schema/index.js";
import { createCodRoutes } from "../src/modules/orders/cod.routes.js";
import { CodOperationsService } from "../src/modules/orders/services/cod-operations-service.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const lineId = "22222222-2222-4222-8222-222222222222";
const otherLineId = "33333333-3333-4333-8333-333333333333";
const actorId = "44444444-4444-4444-8444-444444444444";
const serviceToken = "local-test-token-with-no-real-credential";
type Line = { id: string; orderId: string; sellerId: string; fulfillmentStatus: "shipped" | "delivered" | "packed"; codCollectedAt: Date | null; quantity: number; unitPrice: string };

function fixture(secondLine: "delivered" | "shipped" = "delivered") {
  const order = { id: orderId, reference: "NX-TEST", status: "confirmed", paymentMethod: "cod", paymentStatus: "unpaid", total: "20.00" };
  const lines: Line[] = [
    { id: lineId, orderId, sellerId: actorId, fulfillmentStatus: "shipped", codCollectedAt: null, quantity: 1, unitPrice: "10.00" },
    { id: otherLineId, orderId, sellerId: actorId, fulfillmentStatus: secondLine, codCollectedAt: secondLine === "delivered" ? new Date("2026-09-30T00:00:00.000Z") : null, quantity: 1, unitPrice: "10.00" },
  ];
  const events: Record<string, unknown>[] = [];
  const serviceAudits: Record<string, unknown>[] = [];
  const humanAudits: Record<string, unknown>[] = [];
  const outbox: Record<string, unknown>[] = [];
  let requestedEventId = "";
  let requestedLineId = lineId;
  const tx = {
    execute: async () => ({ rows: [{ sequence: events.length + 1 }] }),
    select(fields: Record<string, unknown>) { return { from(table: unknown) { return { where() {
      const result = () => {
        if (table === orderEvents) return events.filter((event) => event.externalEventId === requestedEventId);
        if (table === orders) return [order];
        if (table === orderItems) return "status" in fields ? lines.map((line) => ({ status: line.fulfillmentStatus, collectedAt: line.codCollectedAt })) : lines.filter((line) => line.id === requestedLineId);
        return [];
      };
      return { limit: async () => result(), then: (resolve: (rows: unknown[]) => void) => Promise.resolve(result()).then(resolve) };
    } }; } }; },
    update(table: unknown) { return { set(values: Record<string, unknown>) { return { where() {
      let result: unknown[] = [];
      if (table === orderItems) { Object.assign(lines.find((line) => line.id === requestedLineId)!, values); result = [{ id: requestedLineId }]; }
      else if (table === orders) Object.assign(order, values);
      else if (table === codOutbox) Object.assign(outbox.at(-1)!, values);
      return { returning: async () => result, then: (resolve: (value: unknown) => void) => Promise.resolve(result).then(resolve) };
    } }; } }; },
    insert(table: unknown) { return { values(value: Record<string, unknown>) {
      const row = { ...value };
      if (table === orderEvents) events.push(row);
      if (table === serviceAuditRecords) serviceAudits.push(row);
      if (table === auditRecords) humanAudits.push(row);
      if (table === codOutbox) { Object.assign(row, { id: "55555555-5555-4555-8555-555555555555", createdAt: new Date("2026-09-30T00:00:00.000Z") }); outbox.push(row); }
      return { returning: async () => [row], then: (resolve: (value: unknown) => void) => Promise.resolve(undefined).then(resolve) };
    } }; },
  };
  const database = { transaction: async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx) };
  const operations = new CodOperationsService(database as never);
  const routes = createCodRoutes({ sessions: { async resolve() { return null; } }, operations, config: { token: serviceToken, actorId, webhookSecret: "unused-test-secret", webhookUrl: "http://localhost/unused" } });
  const app = new Hono().basePath("/api"); app.route("/cod", routes);
  const callback = (eventId: string, action = "cod.delivery_collected", orderItemId = lineId, token = serviceToken) => {
    requestedEventId = eventId; requestedLineId = orderItemId;
    return app.request("http://localhost/api/cod/local/callback", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ eventId, action, orderItemId }) });
  };
  return { app, order, lines, events, serviceAudits, humanAudits, outbox, callback, operations };
}

test("Admin delivery alone records delivery without COD collection", async () => {
  const f = fixture();
  await assert.rejects(f.operations.transition({ orderId, orderItemId: lineId, action: "delivered", collectionEvidence: true, actor: { kind: "admin", id: actorId } }), { code: "INVALID_TRANSITION" });
  assert.equal(f.lines[0]!.fulfillmentStatus, "shipped");
  const delivered = await f.operations.transition({ orderId, orderItemId: lineId, action: "delivered", actor: { kind: "admin", id: actorId } });
  assert.equal(delivered.fulfillmentStatus, "delivered");
  assert.equal(f.lines[0]!.codCollectedAt, null);
  assert.equal(f.order.paymentStatus, "unpaid");
  assert.equal(f.events[0]!.eventType, "fulfillment_delivered");
  assert.equal(f.outbox.length, 0);
  const collected = await f.operations.transition({ orderId, orderItemId: lineId, action: "delivered", collectionEvidence: true, actor: { kind: "admin", id: actorId } });
  assert.equal(collected.duplicate, false);
  assert.ok(f.lines[0]!.codCollectedAt instanceof Date);
  assert.equal(f.order.paymentStatus, "collected");
  assert.equal(f.events[1]!.eventType, "cod_delivered_collected");
  assert.equal(f.humanAudits[1]!.action, "cod.delivery_collected");
});

test("Admin delivery cannot mutate a line under a different order identifier", async () => {
  const f = fixture();
  await assert.rejects(f.operations.transition({ orderId: "99999999-9999-4999-8999-999999999999", orderItemId: lineId, action: "delivered", actor: { kind: "admin", id: actorId } }), { code: "NOT_FOUND" });
  assert.equal(f.lines[0]!.fulfillmentStatus, "shipped");
  assert.equal(f.order.paymentStatus, "unpaid");
  assert.deepEqual([f.events.length, f.humanAudits.length, f.outbox.length], [0, 0, 0]);
});

test("shipped COD callback collects in one service transaction and attributes only the machine actor", async () => {
  const f = fixture();
  const response = await f.callback("execution_123");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { fulfillment: { orderId, orderItemId: lineId, fulfillmentStatus: "delivered", duplicate: false } });
  assert.equal(f.lines[0]!.fulfillmentStatus, "delivered");
  assert.ok(f.lines[0]!.codCollectedAt instanceof Date);
  assert.equal(f.order.paymentStatus, "collected");
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0]!.actorId, null);
  assert.equal(f.events[0]!.serviceActorId, actorId);
  assert.equal(f.serviceAudits.length, 1);
  assert.equal(f.serviceAudits[0]!.serviceActorId, actorId);
  assert.equal(f.humanAudits.length, 0);
  assert.equal(f.outbox.length, 1);
});

test("same callback event ID is idempotent without duplicate state, event, audit, or outbox", async () => {
  const f = fixture();
  assert.equal((await f.callback("execution_123")).status, 200);
  const collectionTime = f.lines[0]!.codCollectedAt;
  const retry = await f.callback("execution_123");
  assert.equal(retry.status, 200);
  assert.deepEqual(await retry.json(), { fulfillment: { orderId, orderItemId: lineId, fulfillmentStatus: "delivered", duplicate: true } });
  assert.equal(f.lines[0]!.codCollectedAt, collectionTime);
  assert.deepEqual([f.events.length, f.serviceAudits.length, f.outbox.length], [1, 1, 1]);
  assert.equal((await f.callback("execution_123", "cod.delivery_failed")).status, 409);
  assert.equal((await f.callback("execution_123", "cod.delivery_collected", otherLineId)).status, 409);
});

test("an event ID previously attributed to another source cannot be replayed as n8n", async () => {
  const f = fixture();
  f.events.push({ externalEventId: "execution_123", orderItemId: lineId, toStatus: "delivered", source: "account", serviceActorId: null });
  const response = await f.callback("execution_123");
  assert.equal(response.status, 409);
  assert.equal(f.lines[0]!.fulfillmentStatus, "shipped");
  assert.equal(f.serviceAudits.length, 0);
  assert.equal(f.outbox.length, 0);
});

test("a fresh event ID cannot bypass the delivered line transition", async () => {
  const f = fixture();
  await f.callback("execution_123");
  const response = await f.callback("execution_456");
  assert.equal(response.status, 409);
  assert.deepEqual([f.events.length, f.serviceAudits.length, f.outbox.length], [1, 1, 1]);
});

test("collection stays unpaid until every line has delivered collection evidence", async () => {
  const f = fixture("shipped");
  assert.equal((await f.callback("execution_123")).status, 200);
  assert.equal(f.order.paymentStatus, "unpaid");
  assert.equal(f.lines[1]!.codCollectedAt, null);
});

test("callback rejects missing or invalid bearer and malformed payloads before mutation", async () => {
  const f = fixture(); const url = "http://localhost/api/cod/local/callback";
  const valid = { eventId: "execution_123", orderItemId: lineId, action: "cod.delivery_collected" };
  const send = (body: unknown, authorization?: string) => f.app.request(url, { method: "POST", headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body) });
  for (const authorization of [undefined, serviceToken, "Bearer invalid"]) assert.equal((await send(valid, authorization)).status, 401);
  for (const body of [{ ...valid, orderItemId: "bad" }, { ...valid, action: "cod.payment_collected" }, { ...valid, eventId: "!" }, { ...valid, eventId: " execution_123" }, { ...valid, paymentStatus: "collected" }]) assert.equal((await send(body, `Bearer ${serviceToken}`)).status, 400);
  assert.equal((await f.app.request(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceToken}` }, body: "{" })).status, 400);
  assert.deepEqual([f.events.length, f.serviceAudits.length, f.outbox.length], [0, 0, 0]);
});

test("callback rejects collection before shipping without audit or payment changes", async () => {
  const f = fixture(); f.lines[0]!.fulfillmentStatus = "packed";
  assert.equal((await f.callback("execution_123")).status, 409);
  assert.equal(f.order.paymentStatus, "unpaid");
  assert.deepEqual([f.events.length, f.serviceAudits.length, f.outbox.length], [0, 0, 0]);
});
