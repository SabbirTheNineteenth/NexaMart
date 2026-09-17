import type { AdminReviewRepository } from "../admin-review.repository.js";
import type { AuditDatabase } from "../../audit/audit.repository.js";

export class AdminReviewService {
  constructor(
    private readonly repository: AdminReviewRepository,
    private readonly audit: { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> },
  ) {}

  list() {
    return this.repository.list();
  }

  async setVisibility(input: { reviewId: string; isVisible: boolean; adminId: string }) {
    if (typeof this.repository.withTransaction !== "function") throw new Error("Transaction support is required for audited mutations");
    if (!this.audit || typeof this.audit.record !== "function") throw new Error("Audit support is required for moderated review mutations");

    return this.repository.withTransaction(async (repository, database) => {
      const review = await repository.setVisibility(input);
      if (!review) throw new Error("Review not found");
      await this.audit.record({ actorId: input.adminId, action: "review.visibility_changed", resourceType: "product_review", resourceId: input.reviewId, metadata: { isVisible: input.isVisible } }, database);
      return review;
    });
  }
}
