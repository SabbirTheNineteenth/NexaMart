import type { AuditDatabase } from "../audit/audit.repository.js";

export type PromotionScope = "product" | "order";

export type SellerPromotionInput = {
  sellerId: string;
  name: string;
  scope: PromotionScope;
  productId?: string;
  discountPercent: number;
  startsAt: Date;
  endsAt: Date;
};

export type SellerPromotion = SellerPromotionInput & { id: string; createdAt: Date; updatedAt: Date };

export type SellerPromotionUpdateInput = {
  sellerId: string;
  promotionId: string;
  name?: string;
  discountPercent?: number;
  startsAt?: Date;
  endsAt?: Date;
};

export type SellerPromotionDeleteInput = {
  sellerId: string;
  promotionId: string;
};

export type SellerPromotionRepository = {
  withTransaction<T>(work: (repository: SellerPromotionRepository, database: AuditDatabase) => Promise<T>): Promise<T>;
  create(input: SellerPromotionInput): Promise<SellerPromotion>;
  update(input: SellerPromotionUpdateInput): Promise<SellerPromotion | null>;
  delete(input: SellerPromotionDeleteInput): Promise<boolean>;
  list(sellerId: string): Promise<SellerPromotion[]>;
};
