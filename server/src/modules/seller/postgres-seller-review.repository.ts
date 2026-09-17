import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { productReviews, products } from "../../db/schema/index.js";
import type { SellerReview, SellerReviewRepository } from "./seller-review.repository.js";

export class PostgresSellerReviewRepository implements SellerReviewRepository {
  async listForSeller(sellerId: string): Promise<SellerReview[]> {
    const rows = await db.select({
      id: productReviews.id,
      product: { id: products.id, name: products.name },
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      createdAt: productReviews.createdAt,
      isVisible: productReviews.isVisible,
    })
      .from(productReviews)
      .innerJoin(products, eq(productReviews.productId, products.id))
      .where(eq(products.sellerId, sellerId))
      .orderBy(asc(productReviews.createdAt));

    return rows.map((row) => ({
      id: row.id,
      product: row.product,
      rating: row.rating,
      ...(row.title ? { title: row.title } : {}),
      ...(row.body ? { body: row.body } : {}),
      createdAt: row.createdAt.toISOString(),
      isVisible: row.isVisible,
    }));
  }
}
