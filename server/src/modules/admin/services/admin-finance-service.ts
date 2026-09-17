import type { AdminFinanceRepository } from "../admin-finance.repository.js";
import type { AuditDatabase } from "../../audit/audit.repository.js";

export class AdminFinanceService {
  constructor(private readonly repository: AdminFinanceRepository, private readonly audit?: { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> }) {}

  overview() {
    return this.repository.overview();
  }

  async reviewPayout(input: { payoutId: string; decision: "approve" | "reject"; expectedStatus: "pending"; adminId: string }) {
    if (!this.repository.withTransaction || !this.audit) throw new Error("Payout review support is required");
    return this.repository.withTransaction(async (repository, database) => {
      if (!repository.reviewPayout) throw new Error("Payout review support is required");
      const result = await repository.reviewPayout({ payoutId: input.payoutId, expectedStatus: input.expectedStatus, status: input.decision === "approve" ? "approved" : "rejected", reviewedById: input.adminId });
      if (result.kind === "not_found") throw new Error("Payout request not found");
      if (result.kind === "invalid_state") throw new Error("Payout review is no longer available");
      await this.audit!.record({ actorId: input.adminId, action: "payout.reviewed", resourceType: "payout_record", resourceId: result.payout.id, metadata: { decision: input.decision, status: result.payout.status } }, database);
      return result.payout;
    });
  }
}
