DO $$ BEGIN
  CREATE TYPE "commission_status" AS ENUM ('accrued', 'eligible', 'paid', 'void');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "payout_status" AS ENUM ('pending', 'approved', 'paid', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "commission_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_item_id" uuid NOT NULL UNIQUE REFERENCES "order_items"("id") ON DELETE CASCADE,
  "seller_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "gross_amount" numeric(12,2) NOT NULL,
  "rate_percent" numeric(5,2) NOT NULL,
  "commission_amount" numeric(12,2) NOT NULL,
  "net_amount" numeric(12,2) NOT NULL,
  "status" "commission_status" NOT NULL DEFAULT 'accrued',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "commission_records_non_negative_amounts" CHECK ("gross_amount" >= 0 AND "commission_amount" >= 0 AND "net_amount" >= 0),
  CONSTRAINT "commission_records_rate_range" CHECK ("rate_percent" >= 0 AND "rate_percent" <= 100)
);
CREATE INDEX IF NOT EXISTS "commission_records_seller_status_created_index" ON "commission_records" ("seller_id", "status", "created_at");

CREATE TABLE IF NOT EXISTS "payout_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "reference" varchar(32) NOT NULL UNIQUE,
  "amount" numeric(12,2) NOT NULL CHECK ("amount" > 0),
  "status" "payout_status" NOT NULL DEFAULT 'pending',
  "requested_by_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "reviewed_by_id" uuid REFERENCES "accounts"("id") ON DELETE SET NULL,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payout_records_seller_status_created_index" ON "payout_records" ("seller_id", "status", "created_at");
