DO $$ BEGIN
  CREATE TYPE "promotion_scope" AS ENUM ('product', 'order');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "name" varchar(120) NOT NULL,
  "scope" "promotion_scope" NOT NULL,
  "product_id" uuid REFERENCES "products"("id") ON DELETE CASCADE,
  "discount_percent" numeric(5,2) NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "promotions_discount_percent_range" CHECK ("discount_percent" > 0 AND "discount_percent" <= 100),
  CONSTRAINT "promotions_date_range" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "promotions_scope_target" CHECK (("scope" = 'product' AND "product_id" IS NOT NULL) OR ("scope" = 'order' AND "product_id" IS NULL))
);
CREATE INDEX IF NOT EXISTS "promotions_seller_starts_at_index" ON "promotions" ("seller_id", "starts_at");
