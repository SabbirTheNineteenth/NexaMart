CREATE TABLE "addresses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "account_id" uuid NOT NULL,
  "recipient_name" varchar(120) NOT NULL,
  "phone" varchar(32) NOT NULL,
  "line1" varchar(180) NOT NULL,
  "line2" varchar(180),
  "city" varchar(120) NOT NULL,
  "region" varchar(120),
  "postal_code" varchar(24),
  "country" varchar(2) NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_account_default_unique" ON "addresses" USING btree ("account_id") WHERE "addresses"."is_default" = true;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address_snapshot" jsonb;--> statement-breakpoint
UPDATE "orders" SET "shipping_address_snapshot" = '{"recipientName":"Legacy order","phone":"","line1":"Address unavailable","city":"","country":"BD"}'::jsonb WHERE "shipping_address_snapshot" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "shipping_address_snapshot" SET NOT NULL;
