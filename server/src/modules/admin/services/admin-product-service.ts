import type { AdminProductRepository } from "../admin-product.repository.js";
import type { AuditDatabase } from "../../audit/audit.repository.js";
import type { SellerNotificationRepository } from "../../notifications/seller-notification.repository.js";

type AdminProductAudit = {
  record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown>;
};

export class AdminProductService {
  constructor(
    private readonly repository: AdminProductRepository,
    private readonly audit: AdminProductAudit,
    private readonly notifications?: Pick<SellerNotificationRepository, "recordModerationDecision">,
  ) {}

  async setPublication(input: { productId: string; isPublished: boolean; expectedRevision: string; adminId: string }) {
    this.requireMutationDependencies();
    return this.inTransaction(async (repository, database) => {
      const result = await repository.setPublication(input);
      if (result.kind === "not_found") throw new Error("Product not found");
      if (result.kind === "stale") throw new Error("Product changed; reload and review again.");
      if (result.kind === "ineligible") throw new Error("Product taxonomy is not eligible for publication");
      await this.audit.record({ actorId: input.adminId, action: "product.publication_changed", resourceType: "product", resourceId: input.productId, metadata: { isPublished: input.isPublished } }, database);
      return result.product;
    });
  }

  async moderate(input: { productId: string; status: import("../admin-product.repository.js").ModerationStatus; reason?: string; expectedRevision: string; adminId: string }) {
    this.requireMutationDependencies();
    if (!this.notifications || typeof this.notifications.recordModerationDecision !== "function") throw new Error("Notification support is required for product moderation");
    const notifications = this.notifications;
    if (input.status !== "approved" && !input.reason?.trim()) throw new Error("A moderation reason is required");
    return this.inTransaction(async (repository, database) => {
      const result = await repository.moderate({ ...input, reason: input.reason?.trim() });
      if (result.kind === "not_found") throw new Error("Product not found");
      if (result.kind === "stale") throw new Error("Product changed; reload and review again.");
      await this.audit.record({ actorId: input.adminId, action: "product.moderation_changed", resourceType: "product", resourceId: input.productId, metadata: { status: input.status, ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}) } }, database);
      if (!result.product.seller?.id) throw new Error("Seller owner is required for product moderation notification");
      await notifications.recordModerationDecision({ sellerId: result.product.seller.id, productId: result.product.id, productName: result.product.name, status: input.status, reason: input.reason?.trim() }, database);
      return result.product;
    });
  }

  private inTransaction<T>(work: (repository: AdminProductRepository, database: AuditDatabase) => Promise<T>): Promise<T> {
    return this.repository.withTransaction(work);
  }

  private requireMutationDependencies(): void {
    if (typeof this.repository.withTransaction !== "function") throw new Error("Transaction support is required for audited mutations");
    if (!this.audit || typeof this.audit.record !== "function") throw new Error("Audit support is required for moderated product mutations");
  }
}
