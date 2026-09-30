import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../src/db/client.js";
import { customerTelegramLinkChallenges, customerTelegramLinks, orders } from "../src/db/schema/index.js";
import { describeTelegramLinkState, PostgresTelegramLinkRepository } from "../src/modules/notifications/postgres-telegram-link.repository.js";

const accountId = "1".repeat(8) + "-1111-4111-8111-" + "1".repeat(12);
const chatId = "5".repeat(9);
const code = "A".repeat(43);

test("pending, expired, conflicted, and verified states follow stored challenge and link truth", () => {
  const now = new Date("2026-09-30T00:00:00.000Z");
  assert.deepEqual(describeTelegramLinkState(false, null, null, now), { status: "not_linked", phone: null });
  assert.deepEqual(describeTelegramLinkState(false, { expiresAt: new Date(now.getTime() + 60_000), lastError: null }, null, now), { status: "link_pending", phone: null });
  assert.deepEqual(describeTelegramLinkState(false, { expiresAt: now, lastError: null }, null, now), { status: "error", reason: "expired", phone: null });
  assert.deepEqual(describeTelegramLinkState(false, { expiresAt: new Date(now.getTime() + 60_000), lastError: "chat_in_use" }, null, now), { status: "error", reason: "chat_in_use", phone: null });
  assert.deepEqual(describeTelegramLinkState(true, null, null, now), { status: "linked", phone: null });
});

test("one consumed start token cannot link a second time or change the chat", async () => {
  let challengeAvailable = true; let storedChat: string | null = null; let insertions = 0;
  const tx = {
    delete(table: unknown) { assert.equal(table, customerTelegramLinkChallenges); return { where() { return { async returning() { if (!challengeAvailable) return []; challengeAvailable = false; return [{ accountId }]; } }; } }; },
    insert(table: unknown) { assert.equal(table, customerTelegramLinks); return { values(value: { chatId: string }) { return { async onConflictDoUpdate() { storedChat = value.chatId; insertions++; } }; } }; },
  };
  const repository = new PostgresTelegramLinkRepository({ transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx) } as unknown as typeof db);
  assert.equal(await repository.complete({ code, chatId, telegramUserId: chatId }), "linked");
  assert.equal(await repository.complete({ code, chatId, telegramUserId: chatId }), "invalid");
  assert.equal(await repository.complete({ code, chatId: "6".repeat(9), telegramUserId: "6".repeat(9) }), "invalid");
  assert.equal(storedChat, chatId);
  assert.equal(insertions, 1);
});

test("a chat owned by another account is rejected and exposes an actionable link error", async () => {
  let markedInUse = false;
  const tx = {
    delete(table: unknown) { assert.equal(table, customerTelegramLinkChallenges); return { where() { return { async returning() { return [{ accountId }]; } }; } }; },
    insert(table: unknown) { assert.equal(table, customerTelegramLinks); return { values() { return { async onConflictDoUpdate() { throw Object.assign(new Error("conflict"), { code: "23505" }); } }; } }; },
  };
  const database = {
    transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx),
    update(table: unknown) { assert.equal(table, customerTelegramLinkChallenges); return { set(value: { lastError: string }) { assert.equal(value.lastError, "chat_in_use"); return { async where() { markedInUse = true; } }; } }; },
  };
  const repository = new PostgresTelegramLinkRepository(database as unknown as typeof db);
  assert.equal(await repository.complete({ code, chatId, telegramUserId: chatId }), "conflict");
  assert.equal(markedInUse, true);
});

test("requesting a new bot link revokes the old chat before creating a new challenge", async () => {
  const steps: string[] = [];
  const tx = {
    delete(table: unknown) { assert.equal(table, customerTelegramLinks); return { async where() { steps.push("old_chat_revoked"); } }; },
    insert(table: unknown) { assert.equal(table, customerTelegramLinkChallenges); return { values(value: { accountId: string; codeHash: string; expiresAt: Date }) { assert.equal(value.accountId, accountId); assert.equal(value.codeHash.length, 64); return { async onConflictDoUpdate() { steps.push("new_challenge_stored"); } }; } }; },
  };
  const repository = new PostgresTelegramLinkRepository({ transaction: async (run: (value: typeof tx) => Promise<unknown>) => run(tx) } as unknown as typeof db);
  const result = await repository.request(accountId, "NexaMartTestBot");
  const replacement = await repository.request(accountId, "NexaMartTestBot");
  assert.match(result.url, /^https:\/\/t\.me\/NexaMartTestBot\?start=[A-Za-z0-9_-]{43}$/);
  assert.notEqual(result.url, replacement.url);
  assert.deepEqual(steps, ["old_chat_revoked", "new_challenge_stored", "old_chat_revoked", "new_challenge_stored"]);
});

test("recipient resolution follows order ownership and never reads contact metadata", async () => {
  const readTables: unknown[] = [];
  const database = { select() { return { from(table: unknown) { readTables.push(table); return { where() { return { async limit() { return table === orders ? [{ customerId: accountId }] : [{ chatId }]; } }; } }; } }; } };
  const repository = new PostgresTelegramLinkRepository(database as unknown as typeof db);
  assert.deepEqual(await repository.recipient("2".repeat(8) + "-2222-4222-8222-" + "2".repeat(12)), { linked: true, chatId });
  assert.deepEqual(readTables, [orders, customerTelegramLinks]);
});
