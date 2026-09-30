import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = readFileSync(new URL("../automation/n8n/telegram-link-poll-code.txt", import.meta.url), "utf8");
const workflow = JSON.parse(readFileSync(new URL("../automation/n8n/workflows/telegram-customer-link-poll.json", import.meta.url), "utf8"));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<Array<{ json: Record<string, unknown> }>>;
const runCode = new AsyncFunction("$getWorkflowStaticData", "$env", "helpers", code);
const env = { NEXAMART_TELEGRAM_BOT_TOKEN: "fake-test-bot-token", N8N_SERVICE_TOKEN: "fake-service-token", NEXAMART_API_BASE: "http://localhost:3000" };
const linkCode = "A".repeat(43);

test("poll workflow contains only NexaMart trigger and reviewed private-start code", () => {
  assert.equal(workflow.nodes.find((node: { id: string }) => node.id === "poll-starts").parameters.jsCode, code.trimEnd());
  assert.equal(workflow.active, false);
  assert.equal(workflow.nodes.filter((node: { type: string }) => node.type.includes("Trigger") || node.type.includes("manualTrigger")).length, 2);
});

test("polling accepts only a private start from the same Telegram user and advances offset", async () => {
  const requests: Record<string, unknown>[] = []; const store: Record<string, unknown> = {};
  const result = await runCode(() => store, env, { httpRequest: async (options: Record<string, unknown>) => {
    requests.push(options);
    if (String(options.url).includes("getUpdates")) return { ok: true, result: [
      { update_id: 10, message: { text: `/start ${linkCode}`, chat: { id: 123, type: "group" }, from: { id: 123 } } },
      { update_id: 11, message: { text: `/start ${linkCode}`, chat: { id: 123, type: "private" }, from: { id: 999 } } },
      { update_id: 12, message: { text: `/start ${linkCode}`, chat: { id: 123, type: "private" }, from: { id: 123 } } },
    ] };
    return { status: "linked" };
  } });
  assert.deepEqual(result[0]!.json, { processed: 3, linked: 1 });
  assert.equal(requests.length, 2);
  assert.equal(store.offset, 13);
  assert.deepEqual(requests[1]!.body, { code: linkCode, chatId: "123", telegramUserId: "123", chatType: "private" });
  assert.doesNotMatch(JSON.stringify(result), /123|fake-test/);
});

test("failed link completion leaves polling offset retryable", async () => {
  const store: Record<string, unknown> = {};
  await assert.rejects(runCode(() => store, env, { httpRequest: async (options: Record<string, unknown>) => {
    if (String(options.url).includes("getUpdates")) return { ok: true, result: [{ update_id: 4, message: { text: `/start ${linkCode}`, chat: { id: 123, type: "private" }, from: { id: 123 } } }] };
    throw new Error("fake network failure");
  } }), /link completion failed/);
  assert.equal(store.offset, undefined);
});

test("expired link codes are handled and do not block later bot starts", async () => {
  const store: Record<string, unknown> = {}; let completions = 0;
  const result = await runCode(() => store, env, { httpRequest: async (options: Record<string, unknown>) => {
    if (String(options.url).includes("getUpdates")) return { ok: true, result: [4, 5].map((update_id) => ({ update_id, message: { text: `/start ${linkCode}`, chat: { id: 123, type: "private" }, from: { id: 123 } } })) };
    return { status: ++completions === 1 ? "invalid" : "linked" };
  } });
  assert.equal(store.offset, 6);
  assert.deepEqual(result[0]!.json, { processed: 2, linked: 1 });
});

test("unexpected link completion response retains the update for retry", async () => {
  const store: Record<string, unknown> = {};
  await assert.rejects(runCode(() => store, env, { httpRequest: async (options: Record<string, unknown>) =>
    String(options.url).includes("getUpdates")
      ? { ok: true, result: [{ update_id: 8, message: { text: `/start ${linkCode}`, chat: { id: 123, type: "private" }, from: { id: 123 } } }] }
      : { status: "unexpected" }
  }), /completion response unavailable/);
  assert.equal(store.offset, undefined);
});
