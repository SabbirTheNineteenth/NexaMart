CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "sku" varchar(120) NOT NULL,
  "options" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "price" numeric(12, 2) NOT NULL,
  "stock" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "product_variants_product_sku_unique" UNIQUE ("product_id", "sku")
);

CREATE TABLE IF NOT EXISTS "product_gallery_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "image_url" text NOT NULL,
  "alt_text" varchar(240),
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "product_gallery_images_product_sort_order_unique" UNIQUE ("product_id", "sort_order")
);

CREATE INDEX IF NOT EXISTS "product_variants_product_id_index" ON "product_variants" ("product_id");
CREATE INDEX IF NOT EXISTS "product_gallery_images_product_id_sort_order_index" ON "product_gallery_images" ("product_id", "sort_order");
