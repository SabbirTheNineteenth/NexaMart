DO $$ BEGIN
  CREATE TYPE "taxonomy_kind" AS ENUM ('category', 'subcategory', 'brand');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "taxonomy_proposal_status" AS ENUM ('pending', 'approved', 'rejected', 'withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subcategories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE restrict,
  "name" varchar(120) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subcategories_category_slug_unique" ON "subcategories" ("category_id", "slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subcategories_category_active_index" ON "subcategories" ("category_id", "is_active");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "brands" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(100) NOT NULL UNIQUE,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taxonomy_proposals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "seller_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE restrict,
  "kind" "taxonomy_kind" NOT NULL,
  "name" varchar(120) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE restrict,
  "status" "taxonomy_proposal_status" DEFAULT 'pending' NOT NULL,
  "canonical_id" uuid,
  "review_note" text,
  "reviewed_by_id" uuid REFERENCES "accounts"("id") ON DELETE set null,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taxonomy_proposals_seller_status_created_index" ON "taxonomy_proposals" ("seller_id", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taxonomy_proposals_status_created_index" ON "taxonomy_proposals" ("status", "created_at");--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subcategory_id" uuid REFERENCES "subcategories"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand_id" uuid REFERENCES "brands"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_category_subcategory_brand_index" ON "products" ("category_id", "subcategory_id", "brand_id");--> statement-breakpoint
INSERT INTO "brands" ("name", "slug")
SELECT DISTINCT ON (lower(trim("brand"))) trim("brand"), left(regexp_replace(lower(trim("brand")), '[^a-z0-9]+', '-', 'g'), 100)
FROM "products"
WHERE "brand" IS NOT NULL AND trim("brand") <> ''
  AND left(regexp_replace(lower(trim("brand")), '[^a-z0-9]+', '-', 'g'), 100) <> ''
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
UPDATE "products" AS product
SET "brand_id" = brand."id"
FROM "brands" AS brand
WHERE product."brand_id" IS NULL AND product."brand" IS NOT NULL AND lower(trim(product."brand")) = lower(brand."name");
