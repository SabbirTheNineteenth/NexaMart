import assert from "node:assert/strict";
import test from "node:test";
import { codOutbox } from "../src/db/schema/index.js";
import { CodOperationsService } from "../src/modules/orders/services/cod-operations-service.js";

type Row = { id: string; eventType: string; payload: Record<string, unknown>; attempts: number; nextAttemptAt: Date; deliveredAt: Date | null; lastError: string | null; deliveryOutcome: string | null };
function fixture(initial: Partial<Row> = {}) {
  const row: Row = { id: "11111111-1111-4111-8111-111111111111", eventType: "cod.order.created", payload: { eventId: "event_123", eventType: "cod.order.created" }, attempts: 0, nextAttemptAt: new Date(0), deliveredAt: null, lastError: null, deliveryOutcome: null, ...initial };
  const database = {
    select() { return { from(table: unknown) { assert.equal(table, codOutbox); return { where() { return { async limit() { return row.deliveredAt === null && row.nextAttemptAt <= new Date() ? [{ ...row }] : []; } }; } }; } }; },
    update(table: unknown) { assert.equal(table, codOutbox); return { set(values: Partial<Row>) { return { where() {
      const claimed = row.deliveredAt === null && row.nextAttemptAt <= new Date() && row.attempts < 5;
      if (values.lastError === "Outcome pending" && !claimed) return { returning: async () => [], then: (resolve: (value: unknown) => void) => Promise.resolve(undefined).then(resolve) };
      Object.assign(row, { ...values, ...(typeof values.attempts === "object" ? { attempts: row.attempts + 1 } : {}) });
      return { returning: async () => [{ ...row }], then: (resolve: (value: unknown) => void) => Promise.resolve(undefined).then(resolve) };
    } }; } }; },
  };
  return { row, service: new CodOperationsService(database as never) };
}
const input = (transport: typeof fetch) => ({ url: "http://localhost/unused", secret: "local-test-secret", transport });

test("ordinary dispatch never resends a delivered outbox event", async () => {
  const f = fixture({ deliveredAt: new Date("2026-09-30T00:00:00.000Z") });
  let sent = 0;
  const result = await f.service.dispatch(input((async () => { sent++; return new Response(null, { status: 200 }); }) as typeof fetch));
  assert.equal(sent, 0);
  assert.equal(result.attempted, 0);
  assert.equal(result.delivered, 0);
});

test("failed dispatch is visible and cannot exceed five attempts", async () => {
  const f = fixture({ attempts: 4 });
  let sent = 0;
  const transport = (async () => { sent++; return new Response(null, { status: 503 }); }) as typeof fetch;
  const first = await f.service.dispatch(input(transport));
  assert.deepEqual(first, { attempted: 1, delivered: 0, failed: 1, exhausted: 1, skipped: 0 });
  assert.equal(f.row.attempts, 5);
  assert.equal(f.row.deliveredAt, null);
  assert.equal(f.row.lastError, "HTTP 503");
  f.row.nextAttemptAt = new Date(0);
  const second = await f.service.dispatch(input(transport));
  assert.equal(second.attempted, 0);
  assert.equal(sent, 1);
});

test("concurrent dispatch calls claim one event once", async () => {
  const f = fixture();
  let sent = 0;
  const transport = (async () => { sent++; return new Response(null, { status: 200 }); }) as typeof fetch;
  const [first, second] = await Promise.all([f.service.dispatch(input(transport)), f.service.dispatch(input(transport))]);
  assert.equal(sent, 1);
  assert.equal(first.delivered + second.delivered, 1);
  assert.equal(f.row.attempts, 1);
  assert.ok(f.row.deliveredAt instanceof Date);
  const repeat = await f.service.dispatch(input(transport));
  assert.equal(repeat.attempted, 0);
  assert.equal(sent, 1);
});

test("Telegram delivery result is persisted only after matching webhook acknowledgement", async () => {
  const f = fixture({ eventType: "order.status_updated" });
  const transport = (async () => Response.json({ ok: true, eventId: f.row.id, deliveryOutcome: "skipped_unlinked" })) as typeof fetch;
  assert.equal((await f.service.dispatch(input(transport))).delivered, 1);
  assert.equal(f.row.deliveryOutcome, "skipped_unlinked");
  assert.ok(f.row.deliveredAt);
  assert.equal((await f.service.dispatch(input(transport))).attempted, 0);
});

test("missing Telegram acknowledgement remains failed and retryable", async () => {
  const f = fixture({ eventType: "order.created" });
  const invalid = (async () => Response.json({ ok: true, eventId: f.row.id })) as typeof fetch;
  assert.equal((await f.service.dispatch(input(invalid))).failed, 1);
  assert.equal(f.row.deliveredAt, null);
  f.row.nextAttemptAt = new Date(0);
  const success = (async () => Response.json({ ok: true, eventId: f.row.id, deliveryOutcome: "telegram_sent" })) as typeof fetch;
  assert.equal((await f.service.dispatch(input(success))).delivered, 1);
  assert.equal(f.row.deliveryOutcome, "telegram_sent");
});
