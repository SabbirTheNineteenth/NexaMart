import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { orderItems, products, sellerNotifications } from "../../db/schema/index.js";
import type { SellerQueueRepository } from "./seller-queue.types.js";

export class PostgresSellerQueueRepository implements SellerQueueRepository {
  async overview(sellerId: string) {
    const [pendingFulfillmentRows, unreadNotificationRows, reviewProductRows, outOfStockProductRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(orderItems).where(and(eq(orderItems.sellerId, sellerId), eq(orderItems.fulfillmentStatus, "pending"))),
      db.select({ count: sql<number>`count(*)::int` }).from(sellerNotifications).where(and(eq(sellerNotifications.sellerId, sellerId), isNull(sellerNotifications.readAt))),
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(and(eq(products.sellerId, sellerId), inArray(products.moderationStatus, ["draft", "changes_requested"]))),
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(and(eq(products.sellerId, sellerId), eq(products.stock, 0))),
    ]);

    return {
      pendingFulfillmentLines: pendingFulfillmentRows[0]?.count ?? 0,
      unreadNotifications: unreadNotificationRows[0]?.count ?? 0,
      productsNeedingReview: reviewProductRows[0]?.count ?? 0,
      outOfStockProducts: outOfStockProductRows[0]?.count ?? 0,
    };
  }
}
