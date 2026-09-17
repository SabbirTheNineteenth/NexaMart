-- Unapplied by design. Apply only through the approved production migration process.
CREATE TYPE "product_moderation_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'changes_requested');
ALTER TABLE "products" ADD COLUMN "moderation_status" "product_moderation_status" NOT NULL DEFAULT 'draft';
ALTER TABLE "products" ADD COLUMN "moderation_reason" text;
ALTER TABLE "products" ADD COLUMN "moderated_by_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL;
ALTER TABLE "products" ADD COLUMN "moderated_at" timestamp with time zone;
ALTER TABLE "products" ADD COLUMN "moderation_revision" integer NOT NULL DEFAULT 0;
CREATE INDEX "products_moderation_status_created_at_index" ON "products" ("moderation_status", "created_at");
