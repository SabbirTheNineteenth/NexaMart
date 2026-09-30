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
  assert.doesNotMatch(account, /name="chatId"|Telegram notification sent/);
});

test("Account saves Telegram contact separately from an explicit bot link", () => {
  assert.match(account, /name="telegramPhone"/);
  assert.match(account, /putJSON<.*Telegram.*>\("\/telegram\/contact"/);
  assert.match(account, /number alone|number is not|number does not/i);
  assert.match(account, /Link Telegram/);
  assert.match(account, /botWindow\?\.location\.replace\(result\.url\)/);
  assert.match(account, /Unlink Telegram/);
  assert.match(account, /link_pending/);
});
