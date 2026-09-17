import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { productReviews, products } from "../../db/schema/index.js";
import type { TransactionalDatabase } from "../audit/audit.repository.js";
import type { AdminReview, AdminReviewRepository } from "./admin-review.repository.js";

type ReviewTransactionalDatabase = TransactionalDatabase & Pick<typeof db, "execute">;

const toAdminReview = (row: typeof productReviews.$inferSelect): AdminReview => ({
  id: row.id,
  productId: row.productId,
  customerId: row.customerId,
  rating: row.rating,
  ...(row.title ? { title: row.title } : {}),
  ...(row.body ? { body: row.body } : {}),
  isVisible: row.isVisible,
  createdAt: row.createdAt.toISOString(),
});

export class PostgresAdminReviewRepository implements AdminReviewRepository {
  constructor(private readonly database: ReviewTransactionalDatabase = db) {}

  async withTransaction<T>(work: (repository: AdminReviewRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited mutations");
    return this.database.transaction(async (transaction) => work(new PostgresAdminReviewRepository(transaction), transaction));
  }

  async list() {
    const rows = await this.database.select().from(productReviews).orderBy(asc(productReviews.createdAt));
    return rows.map(toAdminReview);
  }

  async setVisibility(input: { reviewId: string; isVisible: boolean }) {
    const [target] = await this.database.select({ productId: productReviews.productId })
      .from(productReviews)
      .where(eq(productReviews.id, input.reviewId))
      .limit(1);
    if (!target) return null;
    await this.database.execute(sql`select pg_advisory_xact_lock(hashtext(${`review-product:${target.productId}`}))`);
    const [review] = await this.database.update(productReviews)
      .set({ isVisible: input.isVisible, updatedAt: new Date() })
      .where(eq(productReviews.id, input.reviewId))
      .returning();
    if (!review) return null;

    const [aggregate] = await this.database.select({ average: sql<string>`avg(${productReviews.rating})`, count: sql<number>`count(*)::int` })
      .from(productReviews)
      .where(and(eq(productReviews.productId, review.productId), eq(productReviews.isVisible, true)));
    await this.database.update(products)
      .set({ rating: Number(aggregate.average).toFixed(2), reviewCount: aggregate.count, updatedAt: new Date() })
      .where(eq(products.id, review.productId));

    return toAdminReview(review);
  }
}
