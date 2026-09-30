import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { signCodWebhook } from "../src/modules/orders/cod.js";

const code = readFileSync(new URL("../automation/n8n/telegram-order-code.txt", import.meta.url), "utf8");
const workflow = JSON.parse(readFileSync(new URL("../automation/n8n/workflows/cod-order-operations.json", import.meta.url), "utf8"));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<Array<{ json: Record<string, unknown> }>>;
const runCode = new AsyncFunction("$input", "$env", "$getWorkflowStaticData", "require", "helpers", code);
const eventId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const lineId = "33333333-3333-4333-8333-333333333333";
const secret = "fake-test-webhook-secret";
const env = { N8N_WEBHOOK_SECRET: secret, NEXAMART_ADMIN_TELEGRAM_CHAT_ID: "444444444", NEXAMART_TELEGRAM_BOT_TOKEN: "fake-test-bot-token", NEXAMART_API_BASE: "http://localhost:3000", N8N_SERVICE_TOKEN: "fake-service-token" };
const created = { eventId, eventType: "order.created", orderId, reference: "NX-TEST", paymentMethod: "cod", paymentStatus: "unpaid", orderStatus: "pending", fulfillmentStatus: "pending", currency: "BDT", total: "350.00", items: [{ name: "Cotton shirt", quantity: 2 }] };
const updated = { eventId, eventType: "order.status_updated", orderId, orderItemId: lineId, reference: "NX-TEST", itemName: "Cotton shirt", fulfillmentStatus: "processing", paymentMethod: "cod", paymentStatus: "unpaid" };

function fixture(event: Record<string, unknown>, handler: (options: Record<string, unknown>) => unknown, store: Record<string, unknown> = {}) {
  const raw = JSON.stringify(event); const timestamp = Math.floor(Date.now() / 1000);
  const input = { first: () => ({ json: { headers: { "x-nexamart-timestamp": String(timestamp), "x-nexamart-signature": signCodWebhook(secret, timestamp, raw) }, body: raw } }) };
  return runCode(input, env, () => store, () => crypto, { httpRequest: handler }).then((items) => items[0]!.json);
}

test("tracked workflow embeds reviewed code and acknowledges delivery outcomes", () => {
  assert.equal(workflow.nodes.find((node: { id: string }) => node.id === "verify").parameters.jsCode, code.trimEnd());
  assert.match(workflow.nodes.find((node: { id: string }) => node.id === "respond").parameters.responseBody, /deliveryOutcome/);
});

test("one signed order-created event sends one redacted Admin message on retry", async () => {
  const store = {}; const calls: Record<string, unknown>[] = [];
  const send = async (options: Record<string, unknown>) => { calls.push(options); return { ok: true }; };
  const event = { ...created, customerEmail: "private@example.test", shippingPhone: "private-phone" };
  const first = await fixture(event, send, store);
  const repeat = await fixture(event, send, store);
  assert.equal(first.deliveryOutcome, "telegram_sent"); assert.equal(repeat.duplicate, true);
  assert.equal(calls.length, 1);
  assert.equal((calls[0]!.body as Record<string, unknown>).chat_id, env.NEXAMART_ADMIN_TELEGRAM_CHAT_ID);
  const message = String((calls[0]!.body as Record<string, unknown>).text);
  assert.match(message, /NX-TEST|Cotton shirt|350\.00|Awaiting Admin approval|Pending; pay on delivery/);
  assert.doesNotMatch(message, /private@example|private-phone|Collected on delivery/);
});

test("unlinked customer is skipped truthfully and never receives a Telegram send", async () => {
  const calls: Record<string, unknown>[] = [];
  const result = await fixture(updated, async (options) => { calls.push(options); return { linked: false }; });
  assert.equal(result.deliveryOutcome, "skipped_unlinked");
  assert.equal(calls.length, 1);
  assert.match(String(calls[0]!.url), new RegExp(`/recipient/${orderId}$`));
});

test("linked owner receives only the Server-resolved chat and unpaid status", async () => {
  const calls: Record<string, unknown>[] = [];
  const result = await fixture({ ...updated, chatId: "999999999" }, async (options) => {
    calls.push(options);
    return String(options.url).includes("/recipient/") ? { linked: true, chatId: "555555555" } : { ok: true };
  });
  assert.equal(result.deliveryOutcome, "telegram_sent");
  assert.equal(calls.length, 2);
  const sent = calls[1]!.body as Record<string, unknown>;
  assert.equal(sent.chat_id, "555555555");
  assert.match(String(sent.text), /processing|Pending; pay on delivery/);
  assert.doesNotMatch(String(sent.text), /999999999|Collected on delivery/);
});

test("failed Telegram send leaves event retryable until one success", async () => {
  const store = {}; let sends = 0;
  const handler = async () => { sends++; if (sends === 1) throw new Error("fake network failure"); return { ok: true }; };
  await assert.rejects(fixture(created, handler, store), /Telegram delivery failed/);
  assert.equal(Object.keys(store).length, 0);
  assert.equal((await fixture(created, handler, store)).deliveryOutcome, "telegram_sent");
  assert.equal((await fixture(created, handler, store)).duplicate, true);
  assert.equal(sends, 2);
});
