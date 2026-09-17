CREATE TABLE "product_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "order_item_id" uuid NOT NULL,
  "customer_id" uuid NOT NULL,
  "rating" integer NOT NULL,
  "title" varchar(120),
  "body" text,
  "is_visible" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_accounts_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);--> statement-breakpoint
CREATE UNIQUE INDEX "product_reviews_customer_order_item_unique" ON "product_reviews" USING btree ("customer_id","order_item_id");--> statement-breakpoint
CREATE INDEX "product_reviews_product_visible_created_index" ON "product_reviews" USING btree ("product_id","is_visible","created_at");
