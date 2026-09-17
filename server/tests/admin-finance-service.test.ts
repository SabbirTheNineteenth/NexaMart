import assert from "node:assert/strict";
import test from "node:test";
import { AdminFinanceService } from "../src/modules/admin/services/admin-finance-service.js";

const overview = {
  summary: { grossAmount: "180.00", commissionAmount: "18.00", netAmount: "162.00", accruedNetAmount: "90.00", eligibleNetAmount: "72.00", paidNetAmount: "0.00", pendingPayoutAmount: "72.00" },
  commissions: [{ id: "commission-1", sellerId: "seller-1", orderReference: "ORD-100", orderItemId: "item-1", grossAmount: "100.00", ratePercent: "10.00", commissionAmount: "10.00", netAmount: "90.00", status: "accrued" as const, createdAt: "2026-09-11T00:00:00.000Z" }],
  payouts: [{ id: "payout-1", sellerId: "seller-1", reference: "PAY-100", amount: "72.00", status: "pending" as const, createdAt: "2026-09-11T00:00:00.000Z" }],
};

test("admin finance service delegates its read-only overview to the repository", async () => {
  let calls = 0;
  const service = new AdminFinanceService({
    async overview() { calls += 1; return overview; },
  });

  assert.deepEqual(await service.overview(), overview);
  assert.equal(calls, 1);
});

test("admin finance review is transaction-coupled with its audit record and exact pending-state guard", async () => {
  const events: string[] = [];
  const database = { insert() {} } as any;
  const service = new AdminFinanceService({
    async overview() { return overview; },
    async withTransaction(work) { return work({ async overview() { return overview; }, async reviewPayout() { events.push("review"); return { kind: "updated" as const, payout: { id: "payout-1", status: "approved" as const } }; } }, database); },
  }, { async record(input, usedDatabase) { events.push("audit"); assert.equal(usedDatabase, database); assert.deepEqual(input, { actorId: "admin-1", action: "payout.reviewed", resourceType: "payout_record", resourceId: "payout-1", metadata: { decision: "approve", status: "approved" } }); } });
  assert.deepEqual(await service.reviewPayout({ payoutId: "payout-1", decision: "approve", expectedStatus: "pending", adminId: "admin-1" }), { id: "payout-1", status: "approved" });
  assert.deepEqual(events, ["review", "audit"]);
});
