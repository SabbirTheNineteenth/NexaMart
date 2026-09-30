import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTelegramContactPhone } from "../src/features/account/telegram-contact.js";

test("Telegram contact accepts only normalized international format", () => {
  const fakePhone = "+1" + "5".repeat(10);
  assert.equal(normalizeTelegramContactPhone(`  ${fakePhone}  `), fakePhone);
  assert.equal(normalizeTelegramContactPhone(fakePhone.slice(1)), null);
  assert.equal(normalizeTelegramContactPhone("+" + "0".repeat(9)), null);
  assert.equal(normalizeTelegramContactPhone("+" + "1".repeat(16)), null);
  assert.equal(normalizeTelegramContactPhone("+1 abc"), null);
});
