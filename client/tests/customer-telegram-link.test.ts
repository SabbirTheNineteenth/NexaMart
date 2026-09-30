import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const account = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");

test("customer Account loads real Telegram link state and offers explicit bot start", () => {
  assert.match(account, /getJSON<.*TelegramLink.*>\("\/telegram\/link"/);
  assert.match(account, /postJSON<.*TelegramLink.*>\("\/telegram\/link\/request"/);
  assert.match(account, /Open NexaMart bot/);
  assert.match(account, /delivery unavailable|Delivery unavailable/i);
  assert.match(account, /Refresh Telegram link status/);
});

test("Account never accepts an arbitrary Telegram chat ID or claims a message was sent", () => {
  assert.doesNotMatch(account, /name="chatId"|name="telegramPhone"|Telegram notification sent/);
});
