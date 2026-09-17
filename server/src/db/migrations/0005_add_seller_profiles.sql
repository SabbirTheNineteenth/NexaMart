CREATE TYPE "public"."seller_profile_status" AS ENUM('pending', 'approved', 'rejected', 'suspended', 'active');--> statement-breakpoint
CREATE TABLE "seller_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "store_name" varchar(120) NOT NULL,
  "store_slug" varchar(100) NOT NULL,
  "description" text,
  "status" "seller_profile_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "seller_profiles_account_id_unique" UNIQUE("account_id"),
  CONSTRAINT "seller_profiles_store_slug_unique" UNIQUE("store_slug")
);--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seller_profiles_status_created_at_index" ON "seller_profiles" USING btree ("status","created_at");
