import type { AuditDatabase } from "../../audit/audit.repository.js";
import type { SellerPromotionDeleteInput, SellerPromotionInput, SellerPromotionRepository, SellerPromotionUpdateInput } from "../seller-promotion.repository.js";

export class SellerPromotionService {
  constructor(
    private readonly repository: SellerPromotionRepository,
    private readonly audit: { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> },
  ) {}

  async create(input: SellerPromotionInput) {
    if (input.scope !== "product" || !input.productId) throw new Error("New promotions require product scope");
    if (!Number.isFinite(input.discountPercent) || input.discountPercent < 0.01 || input.discountPercent > 99.99 || Math.round(input.discountPercent * 100) !== input.discountPercent * 100) throw new Error("Promotion discount must be between 0.01 and 99.99 with at most two decimals");
    if (input.endsAt <= input.startsAt) throw new Error("Promotion must end after it starts");
    const audit = this.auditedMutationSupport();
    return this.inTransaction(async (repository, database) => {
      const promotion = await repository.create(input);
      await audit.record({ actorId: input.sellerId, action: "promotion.created", resourceType: "promotion", resourceId: promotion.id, metadata: { scope: input.scope, productId: input.productId, discountPercent: input.discountPercent } }, database);
      return promotion;
    });
  }

  async update(input: SellerPromotionUpdateInput) {
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) throw new Error("Promotion must end after it starts");
    const audit = this.auditedMutationSupport();
    return this.inTransaction(async (repository, database) => {
      const promotion = await repository.update(input);
      if (!promotion) throw new Error("Promotion not found");
      const { sellerId, promotionId, ...editable } = input;
      await audit.record({ actorId: sellerId, action: "promotion.updated", resourceType: "promotion", resourceId: promotionId, metadata: { fields: Object.keys(editable) } }, database);
      return promotion;
    });
  }

  async delete(input: SellerPromotionDeleteInput) {
    const audit = this.auditedMutationSupport();
    await this.inTransaction(async (repository, database) => {
      if (!await repository.delete(input)) throw new Error("Promotion not found");
      await audit.record({ actorId: input.sellerId, action: "promotion.deleted", resourceType: "promotion", resourceId: input.promotionId, metadata: {} }, database);
    });
  }

  async list(sellerId: string) {
    return this.repository.list(sellerId);
  }

  private inTransaction<T>(work: (repository: SellerPromotionRepository, database: AuditDatabase) => Promise<T>): Promise<T> {
    return this.repository.withTransaction(work);
  }

  private auditedMutationSupport() {
    if (!this.audit) throw new Error("Audit support is required for audited mutations");
    if (!this.repository.withTransaction) throw new Error("Transaction support is required for audited mutations");
    return this.audit;
  }
}
