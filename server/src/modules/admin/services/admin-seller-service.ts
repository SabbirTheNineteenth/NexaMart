import type { AdminSellerRepository, SellerTransitionAction } from "../admin-seller.repository.js";
import type { AuditDatabase } from "../../audit/audit.repository.js";

const transitions: Record<SellerTransitionAction, { expectedStatuses: ("pending" | "approved" | "rejected" | "suspended" | "active")[]; nextStatus: "active" | "rejected" | "suspended"; sellerRole: "customer" | "seller" }> = {
  approve: { expectedStatuses: ["pending"], nextStatus: "active", sellerRole: "seller" },
  reject: { expectedStatuses: ["pending"], nextStatus: "rejected", sellerRole: "customer" },
  suspend: { expectedStatuses: ["active"], nextStatus: "suspended", sellerRole: "customer" },
  activate: { expectedStatuses: ["approved", "suspended", "rejected"], nextStatus: "active", sellerRole: "seller" },
};

export class AdminSellerService {
  constructor(
    private readonly repository: AdminSellerRepository,
    private readonly audit: { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> },
  ) {}

  list() {
    return this.repository.list();
  }

  async transition(input: { sellerProfileId: string; action: SellerTransitionAction; adminId: string }) {
    if (typeof this.repository.withTransaction !== "function") throw new Error("Transaction support is required for audited mutations");
    if (!this.audit || typeof this.audit.record !== "function") throw new Error("Audit support is required for moderated seller mutations");
    const transition = transitions[input.action];
    return this.repository.withTransaction(async (repository, database) => {
      const result = await repository.transition({ sellerProfileId: input.sellerProfileId, ...transition });
      if (result.kind === "not_found") throw new Error("Seller application not found");
      if (result.kind === "invalid_state") throw new Error("Seller transition is no longer available");
      const { seller } = result;
      await this.audit.record({
        actorId: input.adminId,
        action: "seller.status_changed",
        resourceType: "seller_profile",
        resourceId: input.sellerProfileId,
        metadata: { action: input.action, status: seller.status },
      }, database);
      return seller;
    });
  }
}
