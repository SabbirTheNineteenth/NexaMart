import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/admin/postgres-admin-finance.repository.ts", import.meta.url), "utf8");

test("admin finance repository reads marketplace commission and payout records in reverse chronological order", () => {
  assert.match(source, /from\(commissionRecords\)[\s\S]*innerJoin\(orderItems,[\s\S]*innerJoin\(orders,[\s\S]*orderBy\(desc\(commissionRecords\.createdAt\)\)/);
  assert.match(source, /from\(payoutRecords\)[\s\S]*orderBy\(desc\(payoutRecords\.createdAt\)\)/);
  assert.match(source, /sellerId: commissionRecords\.sellerId/);
  assert.match(source, /sellerId: payoutRecords\.sellerId/);
  assert.match(source, /orderReference: orders\.reference/);
});

test("admin finance repository returns safe decimal-string aggregates without exposing sensitive payout or account fields", () => {
  assert.match(source, /sql<string>`coalesce\(sum\(\$\{commissionRecords\.grossAmount\}\), 0\)`/);
  assert.match(source, /sql<string>`coalesce\(sum\(\$\{commissionRecords\.commissionAmount\}\), 0\)`/);
  assert.match(source, /sql<string>`coalesce\(sum\(\$\{commissionRecords\.netAmount\}\), 0\)`/);
  assert.match(source, /sql<string>`coalesce\(sum\(case when/);
  assert.match(source, /sql<string>`coalesce\(sum\(\$\{payoutRecords\.amount\}\), 0\)`/);
  assert.match(source, /const zero = "0\.00"/);
  assert.doesNotMatch(source, /passwordHash|accounts\.email|payoutRecords\.note|requestedById/);
});

test("admin finance totals exclude void commission fixtures", () => {
  const commissions = [
    { status: "accrued", grossAmount: "100.00", commissionAmount: "10.00", netAmount: "90.00" },
    { status: "void", grossAmount: "50.00", commissionAmount: "5.00", netAmount: "45.00" },
  ];
  const reported = commissions.filter((commission) => commission.status !== "void");

  assert.deepEqual(reported, [commissions[0]]);
  assert.match(source, /innerJoin\(orders,[\s\S]*\.where\(ne\(commissionRecords\.status, "void"\)\)[\s\S]*orderBy/);
  assert.match(source, /\}\)\.from\(commissionRecords\)\.where\(ne\(commissionRecords\.status, "void"\)\);/);
});

test("admin finance repository atomically guards internal payout review by exact pending state", () => {
  assert.match(source, /reviewedById: input\.reviewedById/);
  assert.match(source, /eq\(payoutRecords\.status, input\.expectedStatus\)/);
  assert.doesNotMatch(source, /status: "paid"|transfer|settlement/i);
});
