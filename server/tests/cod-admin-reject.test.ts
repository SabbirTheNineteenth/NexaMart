import assert from "node:assert/strict";
import test from "node:test";
import { commissionRecords, orderEvents, orderItems, orders } from "../src/db/schema/index.js";
import { CodOperationsService } from "../src/modules/orders/services/cod-operations-service.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const actorId = "22222222-2222-4222-8222-222222222222";
function fixture() {
  const order = { id: orderId, status: "pending", paymentMethod: "cod", paymentStatus: "unpaid" };
  const line = { id: "33333333-3333-4333-8333-333333333333", fulfillmentStatus: "pending" };
  const commission = { status: "accrued" };
  const events: Record<string, unknown>[] = [];
  const audits: Record<string, unknown>[] = [];
  const tx = {
    async execute() { return { rows: [{ sequence: events.length + 2 }] }; },
    select() { return { from() { return { where() { return { async limit() { return [order]; } }; } }; } }; },
    update(table: unknown) { return { set(values: Record<string, unknown>) { return { where() { return { async returning() {
      if (table === orders) { if (order.status !== "pending") return []; Object.assign(order, values); return [order]; }
      if (table === orderItems) { Object.assign(line, values); return [{ id: line.id }]; }
      if (table === commissionRecords) Object.assign(commission, values);
      return [];
    }, then(resolve: (value: unknown) => void) { if (table === commissionRecords) Object.assign(commission, values); return Promise.resolve().then(resolve); } }; } }; } }; },
    insert(table: unknown) { return { values(row: Record<string, unknown>) { (table === orderEvents ? events : audits).push(row); return Promise.resolve(); } }; },
  };
  const operations = new CodOperationsService({ transaction: async (work: (tx: typeof tx) => Promise<unknown>) => work(tx) } as never);
  return { order, line, commission, events, audits, operations };
}

test("Admin rejection cancels only a pending order and its lines with audited reason", async () => {
  const f = fixture();
  const result = await f.operations.reject({ orderId, actorId, note: "Delivery area unavailable" });
  assert.deepEqual(result, { orderId, status: "cancelled" });
  assert.equal(f.line.fulfillmentStatus, "cancelled");
  assert.equal(f.commission.status, "void");
  assert.equal(f.order.paymentStatus, "unpaid");
  assert.equal(f.events[0]?.eventType, "order_rejected");
  assert.equal(f.events[0]?.note, "Delivery area unavailable");
  assert.equal(f.audits[0]?.actorId, actorId);
  await assert.rejects(f.operations.reject({ orderId, actorId }), { code: "INVALID_TRANSITION" });
  assert.deepEqual([f.events.length, f.audits.length], [1, 1]);
});
