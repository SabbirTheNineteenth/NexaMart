import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const admin = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const seller = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

test("admin product moderation offers confirmed approve, reject, and request-changes actions with reason feedback", () => {
  assert.match(admin, /\/admin\/products\/\$\{change\.productId\}\/moderation/);
  assert.match(admin, /Approve/);
  assert.match(admin, /Request changes/);
  assert.match(admin, /Reject/);
  assert.match(admin, /Moderation reason/);
  assert.match(admin, /kind: "moderation"/);
});

test("seller inventory makes persisted moderation outcome and corrective guidance visible", () => {
  assert.match(seller, /product\.moderationStatus/);
  assert.match(seller, /product\.moderationReason/);
  assert.match(seller, /Changes requested/);
  assert.match(seller, /Corrective guidance/);
});
