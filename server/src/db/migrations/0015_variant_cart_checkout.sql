-- PENDING APPROVAL: additive variant-aware cart and checkout migration. Do not apply automatically.
ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE SET NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" uuid REFERENCES "product_variants"("id") ON DELETE SET NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_sku" varchar(120);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_options" jsonb;

DROP INDEX IF EXISTS "cart_items_account_product_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_account_product_variant_unique"
  ON "cart_items" USING btree ("account_id", "product_id", "variant_id");
CREATE INDEX IF NOT EXISTS "cart_items_variant_id_index" ON "cart_items" USING btree ("variant_id");
CREATE INDEX IF NOT EXISTS "order_items_variant_id_index" ON "order_items" USING btree ("variant_id");
