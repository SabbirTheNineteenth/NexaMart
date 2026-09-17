import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, products, promotions } from "../../db/schema/index.js";
import type { AdminPromotionRepository } from "./admin-promotion.repository.js";
import type { AdminPromotionOversight } from "./admin-promotion.routes.js";

export class PostgresAdminPromotionRepository implements AdminPromotionRepository {
  constructor(private readonly database = db) {}

  async list(): Promise<AdminPromotionOversight[]> {
    const rows = await this.database.select({
      promotionId: promotions.id,
      name: promotions.name,
      scope: promotions.scope,
      discountPercent: promotions.discountPercent,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      createdAt: promotions.createdAt,
      sellerId: accounts.id,
      sellerName: accounts.name,
      productId: products.id,
      productName: products.name,
      productImageUrl: products.primaryImageUrl,
    }).from(promotions)
      .innerJoin(accounts, eq(promotions.sellerId, accounts.id))
      .leftJoin(products, eq(promotions.productId, products.id))
      .orderBy(desc(promotions.createdAt));

    return rows.map((promotion) => ({
      id: promotion.promotionId,
      name: promotion.name,
      scope: promotion.scope,
      product: { id: promotion.productId, name: promotion.productName, imageUrl: promotion.productImageUrl },
      seller: { id: promotion.sellerId, name: promotion.sellerName },
      discountPercent: Number(promotion.discountPercent),
      startsAt: promotion.startsAt.toISOString(),
      endsAt: promotion.endsAt.toISOString(),
      createdAt: promotion.createdAt.toISOString(),
    }));
  }
}
