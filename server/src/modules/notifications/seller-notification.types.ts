export type SellerNotificationType = "product_moderation_decision" | "order_line_created";

export type SellerNotification = {
  id: string;
  type: SellerNotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
