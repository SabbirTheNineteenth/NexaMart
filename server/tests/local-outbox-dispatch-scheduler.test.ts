import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { startLocalOutboxDispatchScheduler } from "../src/modules/orders/local-outbox-dispatch-scheduler.js";

test("local scheduler starts only with explicit flag and valid COD configuration", () => {
  const calls: Array<() => void> = [];
  const env = { NODE_ENV: "development", N8N_COD_ENABLED: "1", NEXAMART_LOCAL_OUTBOX_DISPATCH_ENABLED: "1", N8N_WEBHOOK_URL: "http://127.0.0.1:5678/webhook/nexamart-cod", N8N_WEBHOOK_SECRET: "test-secret" };
  const start = (environment: Record<string, string | undefined>) => startLocalOutboxDispatchScheduler(environment, new EventEmitter(), async () => ({ attempted: 0 }), { setInterval: (fn) => { calls.push(fn); return 1 as unknown as NodeJS.Timeout; }, clearInterval: () => {} });
  assert.equal(start({ ...env, NEXAMART_LOCAL_OUTBOX_DISPATCH_ENABLED: "0" }), false);
  assert.equal(start({ ...env, NODE_ENV: "production" }), false);
  assert.equal(start({ ...env, N8N_COD_ENABLED: "0" }), false);
  assert.equal(calls.length, 0);
  assert.equal(start(env), true);
  assert.equal(calls.length, 1);
});

test("ticks do not overlap, failures allow retry, and server close cancels schedule", async () => {
  let tick: (() => void) | undefined;
  let cancelled = false;
  let runs = 0;
  let release: (() => void) | undefined;
  const server = new EventEmitter();
  startLocalOutboxDispatchScheduler({ NODE_ENV: "development", N8N_COD_ENABLED: "1", NEXAMART_LOCAL_OUTBOX_DISPATCH_ENABLED: "1", N8N_WEBHOOK_URL: "http://127.0.0.1:5678/webhook/nexamart-cod", N8N_WEBHOOK_SECRET: "test-secret" }, server, async () => {
    runs++;
    if (runs === 1) await new Promise<void>((resolve) => { release = resolve; });
    else throw new Error("secret-bearing error must not escape");
    return { attempted: 0 };
  }, { setInterval: (fn) => { tick = fn; return 1 as unknown as NodeJS.Timeout; }, clearInterval: () => { cancelled = true; } });
  tick?.(); tick?.();
  assert.equal(runs, 1);
  release?.(); await new Promise((resolve) => setImmediate(resolve));
  tick?.(); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runs, 2);
  server.emit("close");
  assert.equal(cancelled, true);
  tick?.();
  assert.equal(runs, 2);
});
