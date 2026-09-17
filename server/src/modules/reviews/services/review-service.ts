import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { orderItems, orders, productReviews, products, sellerProfiles } from "../../../db/schema/index.js";

export type ReviewInput = { customerId: string; productId: string; orderItemId: string; rating: number; title?: string; body?: string };

export class ReviewService {
  constructor(private readonly database = db) {}

  async create(input: ReviewInput) {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`review-order-item:${input.orderItemId}`}))`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`review-product:${input.productId}`}))`);
      const [eligible] = await tx.select({ id: orderItems.id }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.productId, input.productId), eq(orders.customerId, input.customerId), eq(orderItems.fulfillmentStatus, "delivered"))).limit(1);
      if (!eligible) throw new Error("Only delivered purchases can be reviewed");
      const [review] = await tx.insert(productReviews).values(input).returning({ id: productReviews.id });
      const [aggregate] = await tx.select({ average: sql<string>`avg(${productReviews.rating})`, count: sql<number>`count(*)::int` }).from(productReviews).where(and(eq(productReviews.productId, input.productId), eq(productReviews.isVisible, true)));
      await tx.update(products).set({ rating: Number(aggregate.average).toFixed(2), reviewCount: aggregate.count, updatedAt: new Date() }).where(eq(products.id, input.productId));
      return review;
    });
  }

  async listEligibleForCustomer(customerId: string) {
    const rows = await this.database.select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      productImageUrl: orderItems.productImageUrl,
      orderItemId: orderItems.id,
      orderId: orders.id,
      orderReference: orders.reference,
    }).from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(productReviews, eq(productReviews.orderItemId, orderItems.id))
      .where(and(eq(orders.customerId, customerId), eq(orderItems.fulfillmentStatus, "delivered"), isNull(productReviews.id)))
      .orderBy(desc(orders.createdAt), asc(orderItems.id));

    return rows.filter((row): row is typeof row & { productId: string } => row.productId !== null).map((row) => ({
      product: { id: row.productId, name: row.productName, image: row.productImageUrl },
      orderItem: { id: row.orderItemId },
      order: { id: row.orderId, reference: row.orderReference },
    }));
  }

  async list(productId: string) {
    return this.database.select({ id: productReviews.id, rating: productReviews.rating, title: productReviews.title, body: productReviews.body, createdAt: productReviews.createdAt })
      .from(productReviews)
      .innerJoin(products, and(eq(products.id, productReviews.productId), eq(products.isPublished, true)))
      .innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active")))
      .where(and(eq(productReviews.productId, productId), eq(productReviews.isVisible, true)))
      .orderBy(asc(productReviews.createdAt));
  }
}
