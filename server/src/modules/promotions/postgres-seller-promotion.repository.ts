import { and, desc, eq, exists, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { products, promotions } from "../../db/schema/index.js";
import type { TransactionalDatabase } from "../audit/audit.repository.js";
import type { SellerPromotion, SellerPromotionDeleteInput, SellerPromotionInput, SellerPromotionRepository, SellerPromotionUpdateInput } from "./seller-promotion.repository.js";

const toPromotion = (row: typeof promotions.$inferSelect): SellerPromotion => ({
  id: row.id,
  sellerId: row.sellerId,
  name: row.name,
  scope: row.scope,
  ...(row.productId ? { productId: row.productId } : {}),
  discountPercent: Number(row.discountPercent),
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PostgresSellerPromotionRepository implements SellerPromotionRepository {
  constructor(private readonly database: TransactionalDatabase = db) {}

  async withTransaction<T>(work: (repository: SellerPromotionRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited mutations");
    return this.database.transaction(async (transaction) => work(new PostgresSellerPromotionRepository(transaction), transaction));
  }

  async create(input: SellerPromotionInput) {
    if (input.scope === "product") {
      const [product] = await this.database.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId!), eq(products.sellerId, input.sellerId)));
      if (!product) throw new Error("Product not found");
      const [overlap] = await this.database.select({ id: promotions.id }).from(promotions).where(and(eq(promotions.productId, input.productId!), eq(promotions.scope, "product"), sql`${promotions.startsAt} < ${input.endsAt}`, sql`${promotions.endsAt} > ${input.startsAt}`)).limit(1);
      if (overlap) throw new Error("Promotion schedule overlaps an existing promotion");
    }
    const [promotion] = await this.database.insert(promotions).values({
      sellerId: input.sellerId,
      name: input.name,
      scope: input.scope,
      productId: input.scope === "product" ? input.productId : null,
      discountPercent: input.discountPercent.toFixed(2),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    }).returning();
    return toPromotion(promotion);
  }

  async update(input: SellerPromotionUpdateInput) {
    const { sellerId, promotionId, discountPercent, ...editable } = input;
    const ownedProduct = this.database.select({ id: products.id }).from(products).where(and(eq(products.id, promotions.productId), eq(products.sellerId, sellerId)));
    const ownership = and(eq(promotions.id, promotionId), eq(promotions.sellerId, sellerId), or(isNull(promotions.productId), exists(ownedProduct)));
    if (input.startsAt || input.endsAt) {
      const [current] = await this.database.select().from(promotions).where(ownership).limit(1);
      if (!current) return null;
      const startsAt = input.startsAt ?? current.startsAt;
      const endsAt = input.endsAt ?? current.endsAt;
      if (endsAt <= startsAt) throw new Error("Promotion must end after it starts");
      if (current.scope === "product" && current.productId) {
        const [overlap] = await this.database.select({ id: promotions.id }).from(promotions).where(and(eq(promotions.productId, current.productId), eq(promotions.scope, "product"), ne(promotions.id, promotionId), sql`${promotions.startsAt} < ${endsAt}`, sql`${promotions.endsAt} > ${startsAt}`)).limit(1);
        if (overlap) throw new Error("Promotion schedule overlaps an existing promotion");
      }
    }
    const [promotion] = await this.database.update(promotions).set({ ...editable, ...(discountPercent === undefined ? {} : { discountPercent: discountPercent.toFixed(2) }), updatedAt: new Date() }).where(ownership).returning();
    if (promotion) return toPromotion(promotion);
    return null;
  }

  async delete(input: SellerPromotionDeleteInput) {
    const ownedProduct = this.database.select({ id: products.id }).from(products).where(and(eq(products.id, promotions.productId), eq(products.sellerId, input.sellerId)));
    const ownership = and(eq(promotions.id, input.promotionId), eq(promotions.sellerId, input.sellerId), or(isNull(promotions.productId), exists(ownedProduct)));
    const [promotion] = await this.database.delete(promotions).where(ownership).returning({ id: promotions.id });
    return Boolean(promotion);
  }

  async list(sellerId: string) {
    const rows = await this.database.select().from(promotions).where(eq(promotions.sellerId, sellerId)).orderBy(desc(promotions.startsAt));
    return rows.map(toPromotion);
  }
}
