import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/modules/seller/services/seller-finance-service.ts", import.meta.url),
  "utf8",
);

// The service owns its Drizzle client directly, so this contract test keeps the
// database boundary isolated while protecting the finance read-only response.
test("seller finance summary keeps ledger reads seller-scoped and monetary totals as decimal strings", () => {
  assert.match(source, /where\(eq\(commissionRecords\.sellerId, sellerId\)\)/);
  assert.match(
    source,
    /where\(eq\(payoutRecords\.sellerId, sellerId\)\)/,
  );
  assert.match(source, /payoutRecords\.status} in \('pending', 'approved'\)/);

  assert.match(source, /const zero = "0\.00"/);
  assert.match(source, /sql<string>`coalesce\(sum\(case when/);
  assert.match(source, /sql<string>`coalesce\(sum\(\$\{payoutRecords\.amount\}\), 0\)`/);
  assert.match(
    source,
    /accruedNetAmount: totals\[0\]\?\.accrued \?\? zero,[\s\S]*eligibleNetAmount: eligible,[\s\S]*payableAmount: centsToDecimal\(Math\.max\(0, decimalToCents\(eligible\) - decimalToCents\(heldAmount\)\)\),[\s\S]*heldPayoutAmount: heldAmount/,
  );
});

test("seller finance owns a transaction-coupled payout request, but no payout execution", () => {
  assert.match(source, /db\.transaction\(async \(transaction\)/);
  assert.match(source, /transaction\.insert\(payoutRecords\)/);
  assert.match(source, /action: "payout\.requested"/);
  assert.doesNotMatch(source, /status: "paid"|payout\.executed|transfer|settlement/i);
});
