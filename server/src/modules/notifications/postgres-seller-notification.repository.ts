import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { sellerNotifications } from "../../db/schema/index.js";
import type { NotificationDatabase, SellerNotificationRepository } from "./seller-notification.repository.js";
import { toSellerNotification } from "./seller-notification.repository.js";

export class PostgresSellerNotificationRepository implements SellerNotificationRepository {
  async listForSeller(sellerId: string) {
    const [rows, counts] = await Promise.all([
      db.select({ id: sellerNotifications.id, type: sellerNotifications.type, title: sellerNotifications.title, body: sellerNotifications.body, readAt: sellerNotifications.readAt, createdAt: sellerNotifications.createdAt }).from(sellerNotifications).where(eq(sellerNotifications.sellerId, sellerId)).orderBy(desc(sellerNotifications.createdAt)).limit(100),
      db.select({ count: sql<number>`count(*)::int` }).from(sellerNotifications).where(and(eq(sellerNotifications.sellerId, sellerId), isNull(sellerNotifications.readAt))),
    ]);
    return { notifications: rows.map(toSellerNotification), unreadCount: counts[0]?.count ?? 0 };
  }

  async markRead(input: { sellerId: string; notificationId: string }) {
    const [updated] = await db.update(sellerNotifications).set({ readAt: sql`coalesce(${sellerNotifications.readAt}, now())` }).where(and(eq(sellerNotifications.id, input.notificationId), eq(sellerNotifications.sellerId, input.sellerId))).returning({ id: sellerNotifications.id, type: sellerNotifications.type, title: sellerNotifications.title, body: sellerNotifications.body, readAt: sellerNotifications.readAt, createdAt: sellerNotifications.createdAt });
    return updated ? toSellerNotification(updated) : null;
  }

  async recordModerationDecision(input: { sellerId: string; productId: string; productName: string; status: "approved" | "rejected" | "changes_requested"; reason?: string }, database: NotificationDatabase) {
    const title = input.status === "approved" ? "Product approved" : input.status === "rejected" ? "Product rejected" : "Changes requested";
    const body = input.reason ? `${input.productName}: ${input.reason}` : `${input.productName} has been approved.`;
    const [created] = await database.insert(sellerNotifications).values({ sellerId: input.sellerId, type: "product_moderation_decision", title, body, productId: input.productId }).returning({ id: sellerNotifications.id, type: sellerNotifications.type, title: sellerNotifications.title, body: sellerNotifications.body, readAt: sellerNotifications.readAt, createdAt: sellerNotifications.createdAt });
    return toSellerNotification(created);
  }

  async recordOrderLineCreated(input: { sellerId: string; orderId: string; orderItemId: string; orderReference: string; productName: string; quantity: number }, database: NotificationDatabase) {
    const [created] = await database.insert(sellerNotifications).values({ sellerId: input.sellerId, type: "order_line_created", title: "New order line", body: `${input.productName} × ${input.quantity} in ${input.orderReference}`, orderId: input.orderId, orderItemId: input.orderItemId }).returning({ id: sellerNotifications.id, type: sellerNotifications.type, title: sellerNotifications.title, body: sellerNotifications.body, readAt: sellerNotifications.readAt, createdAt: sellerNotifications.createdAt });
    return toSellerNotification(created);
  }
}
