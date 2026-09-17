import type { db } from "../../db/client.js";
import type { SellerNotification, SellerNotificationType } from "./seller-notification.types.js";

export type NotificationDatabase = Pick<typeof db, "insert">;

export type SellerNotificationRepository = {
  listForSeller(sellerId: string): Promise<{ notifications: SellerNotification[]; unreadCount: number }>;
  markRead(input: { sellerId: string; notificationId: string }): Promise<SellerNotification | null>;
  recordModerationDecision(input: { sellerId: string; productId: string; productName: string; status: "approved" | "rejected" | "changes_requested"; reason?: string }, database: NotificationDatabase): Promise<SellerNotification>;
  recordOrderLineCreated(input: { sellerId: string; orderId: string; orderItemId: string; orderReference: string; productName: string; quantity: number }, database: NotificationDatabase): Promise<SellerNotification>;
};

export type StoredSellerNotification = {
  id: string;
  type: SellerNotificationType;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
};

export const toSellerNotification = (row: StoredSellerNotification): SellerNotification => ({
  id: row.id,
  type: row.type,
  title: row.title,
  body: row.body,
  readAt: row.readAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
});
