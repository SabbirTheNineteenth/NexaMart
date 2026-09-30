import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createTelegramRoutes } from "../src/modules/notifications/telegram-link.routes.js";

const customerId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const linkCode = "A".repeat(43);
const customer = { id: customerId, name: "Customer", email: "customer@example.test", role: "customer" as const, createdAt: "2026-09-30T00:00:00.000Z" };
const admin = { ...customer, role: "admin" as const };
const sessionHeaders = { Cookie: "nexamart_session=fake-session" };
function fixture(role: "customer" | "admin" | null = "customer", completionResult: "linked" | "invalid" | "conflict" = "linked") {
  const calls: unknown[] = [];
  let linked = false;
  const routes = createTelegramRoutes({
    sessions: { async resolve() { return role === "customer" ? customer : role === "admin" ? admin : null; } },
    links: {
      async status(accountId: string) { calls.push(["status", accountId]); return linked ? "linked" as const : "not_linked" as const; },
      async request(accountId: string, botUsername: string) { calls.push(["request", accountId, botUsername]); return { url: `https://t.me/NexaMartTestBot?start=${linkCode}` }; },
      async complete(input: { code: string; chatId: string; telegramUserId: string }) { calls.push(["complete", input]); linked = completionResult === "linked"; return completionResult; },
      async recipient(order: string) { calls.push(["recipient", order]); return order === orderId ? linked ? { linked: true as const, chatId: "123456789" } : { linked: false as const } : null; },
    },
    botUsername: "NexaMartTestBot",
    serviceToken: "fake-service-token-12345678901234567890",
  });
  const app = new Hono().basePath("/api"); app.route("/telegram", routes);
  return { app, calls };
}

test("customer can request a bot start link, while Admin cannot set arbitrary chat IDs", async () => {
  const { app, calls } = fixture();
  const request = await app.request("http://localhost/api/telegram/link/request", { method: "POST", headers: sessionHeaders });
  assert.equal(request.status, 200);
  assert.match((await request.json()).url, /^https:\/\/t\.me\/NexaMartTestBot\?start=/);
  assert.deepEqual(calls, [["request", customerId, "NexaMartTestBot"]]);
  assert.equal((await fixture("admin").app.request("http://localhost/api/telegram/link/request", { method: "POST", headers: sessionHeaders })).status, 403);
});

test("an expired bot start is handled without falsely linking a customer", async () => {
  const { app } = fixture("customer", "invalid");
  const headers = { Authorization: "Bearer fake-service-token-12345678901234567890", "Content-Type": "application/json" };
  const response = await app.request("http://localhost/api/telegram/local/link", { method: "POST", headers, body: JSON.stringify({ code: linkCode, chatId: "123456789", telegramUserId: "123456789", chatType: "private" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "invalid" });
  assert.deepEqual(await (await app.request("http://localhost/api/telegram/link", { headers: sessionHeaders })).json(), { status: "not_linked" });
});

test("unlinked order owner is returned as skipped without a customer chat target", async () => {
  const { app } = fixture();
  const response = await app.request(`http://localhost/api/telegram/local/recipient/${orderId}`, { headers: { Authorization: "Bearer fake-service-token-12345678901234567890" } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { linked: false });
  assert.equal((await app.request(`http://localhost/api/telegram/local/recipient/${orderId}`)).status, 401);
});

test("only a private bot start confirmation links the authenticated customer to that chat", async () => {
  const { app } = fixture(); const headers = { Authorization: "Bearer fake-service-token-12345678901234567890", "Content-Type": "application/json" };
  const complete = async (body: unknown) => app.request("http://localhost/api/telegram/local/link", { method: "POST", headers, body: JSON.stringify(body) });
  assert.equal((await complete({ code: linkCode, chatId: "123456789", telegramUserId: "987654321", chatType: "private" })).status, 400);
  assert.equal((await complete({ code: linkCode, chatId: "123456789", telegramUserId: "123456789", chatType: "group" })).status, 400);
  assert.equal((await complete({ code: linkCode, chatId: "123456789", telegramUserId: "123456789", chatType: "private" })).status, 200);
  const recipient = await app.request(`http://localhost/api/telegram/local/recipient/${orderId}`, { headers });
  assert.equal((await recipient.json()).linked, true);
  const status = await app.request("http://localhost/api/telegram/link", { headers: sessionHeaders });
  assert.deepEqual(await status.json(), { status: "linked" });
});
