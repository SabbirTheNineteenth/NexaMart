CREATE TYPE "public"."fulfillment_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned');--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "seller_id" uuid;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "seller_name" varchar(120);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_image_url" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "fulfillment_status" "fulfillment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
UPDATE "order_items" AS item SET "seller_id" = product."seller_id", "seller_name" = account."name", "product_image_url" = product."primary_image_url" FROM "products" AS product LEFT JOIN "accounts" AS account ON account."id" = product."seller_id" WHERE item."product_id" = product."id";--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_id_accounts_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_seller_fulfillment_index" ON "order_items" USING btree ("seller_id","fulfillment_status");--> statement-breakpoint
CREATE TABLE "order_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "order_item_id" uuid,
  "actor_id" uuid,
  "event_type" varchar(80) NOT NULL,
  "from_status" varchar(32),
  "to_status" varchar(32),
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_events_order_created_at_index" ON "order_events" USING btree ("order_id","created_at");
