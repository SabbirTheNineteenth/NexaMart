import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { commissionRecords, orderItems, orders, payoutRecords } from "../../db/schema/index.js";
import type { AdminFinanceRepository } from "./admin-finance.repository.js";
import type { TransactionalDatabase } from "../audit/audit.repository.js";

const zero = "0.00";

export class PostgresAdminFinanceRepository implements AdminFinanceRepository {
  constructor(private readonly database: TransactionalDatabase = db) {}
  async withTransaction<T>(work: (repository: AdminFinanceRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited payout reviews");
    return this.database.transaction((transaction) => work(new PostgresAdminFinanceRepository(transaction), transaction));
  }
  async overview() {
    const commissions = await this.database.select({
      id: commissionRecords.id,
      sellerId: commissionRecords.sellerId,
      orderReference: orders.reference,
      orderItemId: commissionRecords.orderItemId,
      grossAmount: commissionRecords.grossAmount,
      ratePercent: commissionRecords.ratePercent,
      commissionAmount: commissionRecords.commissionAmount,
      netAmount: commissionRecords.netAmount,
      status: commissionRecords.status,
      createdAt: commissionRecords.createdAt,
    }).from(commissionRecords)
      .innerJoin(orderItems, eq(commissionRecords.orderItemId, orderItems.id))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(ne(commissionRecords.status, "void"))
      .orderBy(desc(commissionRecords.createdAt));
    const payouts = await this.database.select({
      id: payoutRecords.id,
      sellerId: payoutRecords.sellerId,
      reference: payoutRecords.reference,
      amount: payoutRecords.amount,
      status: payoutRecords.status,
      createdAt: payoutRecords.createdAt,
    }).from(payoutRecords).orderBy(desc(payoutRecords.createdAt));
    const commissionTotals = await this.database.select({
      gross: sql<string>`coalesce(sum(${commissionRecords.grossAmount}), 0)`,
      commission: sql<string>`coalesce(sum(${commissionRecords.commissionAmount}), 0)`,
      net: sql<string>`coalesce(sum(${commissionRecords.netAmount}), 0)`,
      accrued: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'accrued' then ${commissionRecords.netAmount} else 0 end), 0)`,
      eligible: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'eligible' then ${commissionRecords.netAmount} else 0 end), 0)`,
      paid: sql<string>`coalesce(sum(case when ${commissionRecords.status} = 'paid' then ${commissionRecords.netAmount} else 0 end), 0)`,
    }).from(commissionRecords).where(ne(commissionRecords.status, "void"));
    const pendingPayout = await this.database.select({ total: sql<string>`coalesce(sum(${payoutRecords.amount}), 0)` })
      .from(payoutRecords)
      .where(eq(payoutRecords.status, "pending"));

    return {
      summary: {
        grossAmount: commissionTotals[0]?.gross ?? zero,
        commissionAmount: commissionTotals[0]?.commission ?? zero,
        netAmount: commissionTotals[0]?.net ?? zero,
        accruedNetAmount: commissionTotals[0]?.accrued ?? zero,
        eligibleNetAmount: commissionTotals[0]?.eligible ?? zero,
        paidNetAmount: commissionTotals[0]?.paid ?? zero,
        pendingPayoutAmount: pendingPayout[0]?.total ?? zero,
      },
      commissions: commissions.map((commission) => ({ ...commission, createdAt: commission.createdAt.toISOString() })),
      payouts: payouts.map((payout) => ({ ...payout, createdAt: payout.createdAt.toISOString() })),
    };
  }

  async reviewPayout(input: { payoutId: string; expectedStatus: "pending"; status: "approved" | "rejected"; reviewedById: string }) {
    const [payout] = await this.database.update(payoutRecords).set({ status: input.status, reviewedById: input.reviewedById, updatedAt: new Date() }).where(and(eq(payoutRecords.id, input.payoutId), eq(payoutRecords.status, input.expectedStatus))).returning({ id: payoutRecords.id, status: payoutRecords.status });
    if (payout) return { kind: "updated" as const, payout };
    const [existing] = await this.database.select({ id: payoutRecords.id }).from(payoutRecords).where(eq(payoutRecords.id, input.payoutId)).limit(1);
    return existing ? { kind: "invalid_state" as const } : { kind: "not_found" as const };
  }
}
