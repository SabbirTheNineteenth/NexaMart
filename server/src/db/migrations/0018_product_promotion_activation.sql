-- Additive server-enforced product flash-offer integrity and immutable order snapshots.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "promotions" DROP CONSTRAINT IF EXISTS "promotions_discount_percent_range";
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_discount_percent_range"
  CHECK ("discount_percent" >= 0.01 AND "discount_percent" <= 99.99);

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "base_unit_price" numeric(12,2);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "promotion_id" uuid REFERENCES "promotions"("id") ON DELETE SET NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "promotion_name" varchar(120);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5,2);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_promotion_snapshot_consistent" CHECK (
  ("promotion_id" IS NULL AND "promotion_name" IS NULL AND "discount_percent" IS NULL AND "base_unit_price" IS NULL)
  OR ("promotion_id" IS NOT NULL AND "promotion_name" IS NOT NULL AND "discount_percent" >= 0.01 AND "discount_percent" <= 99.99 AND "base_unit_price" IS NOT NULL AND "unit_price" < "base_unit_price")
);

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_schedule_no_overlap"
  EXCLUDE USING gist ("product_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("scope" = 'product');
