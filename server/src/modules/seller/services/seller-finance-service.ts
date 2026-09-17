import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { commissionRecords, orderItems, orders, payoutRecords } from "../../../db/schema/index.js";
import type { AuditDatabase } from "../../audit/audit.repository.js";

const zero = "0.00";

export class SellerFinanceService {
  constructor(private readonly audit?: { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> }) {}
  async summary(sellerId: string) {
    const commissions = await db.select({ id: commissionRecords.id, orderReference: orders.reference, orderItemId: commissionRecords.orderItemId, grossAmount: commissionRecords.grossAmount, ratePercent: commissionRecords.ratePercent, commissionAmount: commissionRecords.commissionAmount, netAmount: commissionRecords.netAmount, status: commissionRecords.status, createdAt: commissionRecords.createdAt })
      .from(commissionRecords).innerJoin(orderItems, eq(commissionRecords.orderItemId, orderItems.id)).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(eq(commissionRecords.sellerId, sellerId)).orderBy(desc(commissionRecords.createdAt));
    const payouts = await db.select({ id: payoutRecords.id, reference: payoutRecords.reference, amount: payoutRecords.amount, status: payoutRecords.status, note: payoutRecords.note, createdAt: payoutRecords.createdAt }).from(payoutRecords).where(eq(payoutRecords.sellerId, sellerId)).orderBy(desc(payoutRecords.createdAt));
    const totals = await db.select({ accrued: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'accrued' then ${commissionRecords.netAmount} else 0 end), 0)`, eligible: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'eligible' then ${commissionRecords.netAmount} else 0 end), 0)`, paid: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'paid' then ${commissionRecords.netAmount} else 0 end), 0)` }).from(commissionRecords).where(eq(commissionRecords.sellerId, sellerId));
    const held = await db.select({ total: sql<string>`coalesce(sum(${payoutRecords.amount}), 0)` }).from(payoutRecords).where(and(eq(payoutRecords.sellerId, sellerId), sql`${payoutRecords.status} in ('pending', 'approved')`));
    const eligible = totals[0]?.eligible ?? zero;
    const heldAmount = held[0]?.total ?? zero;
    return { summary: { accruedNetAmount: totals[0]?.accrued ?? zero, eligibleNetAmount: eligible, payableAmount: centsToDecimal(Math.max(0, decimalToCents(eligible) - decimalToCents(heldAmount))), heldPayoutAmount: heldAmount }, commissions: commissions.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })), payouts: payouts.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })) };
  }

  async requestPayout(input: { sellerId: string; amount: string }) {
    if (!this.audit) throw new Error("Audit support is required for payout requests");
    const audit = this.audit;
    return db.transaction(async (transaction) => {
      const [eligible] = await transaction.select({ total: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'eligible' then ${commissionRecords.netAmount} else 0 end), 0)` }).from(commissionRecords).where(eq(commissionRecords.sellerId, input.sellerId));
      const [held] = await transaction.select({ total: sql<string>`coalesce(sum(${payoutRecords.amount}), 0)` }).from(payoutRecords).where(and(eq(payoutRecords.sellerId, input.sellerId), sql`${payoutRecords.status} in ('pending', 'approved')`));
      const payable = decimalToCents(eligible?.total ?? zero) - decimalToCents(held?.total ?? zero);
      if (decimalToCents(input.amount) > payable) throw new Error("Requested amount exceeds currently payable amount");
      const [payout] = await transaction.insert(payoutRecords).values({ sellerId: input.sellerId, requestedById: input.sellerId, amount: input.amount, reference: `PAYOUT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: "pending" }).returning({ id: payoutRecords.id, reference: payoutRecords.reference, amount: payoutRecords.amount, status: payoutRecords.status, createdAt: payoutRecords.createdAt });
      if (!payout) throw new Error("Unable to create payout request");
      await audit.record({ actorId: input.sellerId, action: "payout.requested", resourceType: "payout_record", resourceId: payout.id, metadata: { amount: payout.amount } }, transaction);
      return { ...payout, createdAt: payout.createdAt.toISOString() };
    });
  }
}

const decimalToCents = (value: string) => {
  const [whole = "0", fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
};
const centsToDecimal = (value: number) => `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
