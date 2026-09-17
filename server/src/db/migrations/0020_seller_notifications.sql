-- Unapplied by design. Apply only through the approved production migration process.
CREATE TYPE "seller_notification_type" AS ENUM ('product_moderation_decision', 'order_line_created');
CREATE TABLE "seller_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seller_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "type" "seller_notification_type" NOT NULL,
  "title" varchar(160) NOT NULL,
  "body" text NOT NULL,
  "product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
  "order_id" uuid REFERENCES "orders"("id") ON DELETE CASCADE,
  "order_item_id" uuid REFERENCES "order_items"("id") ON DELETE CASCADE,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "seller_notifications_seller_created_at_index" ON "seller_notifications" ("seller_id", "created_at");
CREATE INDEX "seller_notifications_seller_unread_created_at_index" ON "seller_notifications" ("seller_id", "read_at", "created_at");
