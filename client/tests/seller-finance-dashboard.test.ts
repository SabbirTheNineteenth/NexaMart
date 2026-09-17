import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

test("seller dashboard presents seller-owned review amounts with confirmed review requests", () => {
  assert.match(dashboard, /getJSON<SellerFinance>\("\/seller\/finance", controller\.signal\)/);
  assert.match(dashboard, /<section className="seller-finance" aria-labelledby="seller-finance-heading">/);
  assert.match(dashboard, /<h2 id="seller-finance-heading">Finance overview<\/h2>/);
  assert.match(dashboard, /Available for review/);
  assert.match(dashboard, /Held in review/);
  assert.match(dashboard, /Request payout review/);
  assert.match(dashboard, /postJSON\("\/seller\/finance\/payout-requests"/);
  assert.match(dashboard, /<ConfirmationDialog title="Request payout review\?"/);
  assert.match(dashboard, /<h3>Commission ledger<\/h3>/);
  assert.match(dashboard, /finance\.commissions\.map\(\(commission\)/);
  assert.match(dashboard, /Void ledger entry/);
  assert.match(dashboard, /does not transfer or settle money/);
  assert.match(sellerTypes, /export type SellerFinance =/);
  assert.match(sellerTypes, /accruedNetAmount: string;/);
  assert.match(sellerTypes, /eligibleNetAmount: string;/);
  assert.match(sellerTypes, /payableAmount: string;/);
  assert.match(sellerTypes, /heldPayoutAmount: string;/);
  assert.match(sellerTypes, /SellerPayout/);
});
