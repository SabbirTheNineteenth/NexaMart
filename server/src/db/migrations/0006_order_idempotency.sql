ALTER TABLE "orders" ADD COLUMN "idempotency_key" varchar(128);--> statement-breakpoint
UPDATE "orders" SET "idempotency_key" = 'legacy-' || "id"::text WHERE "idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_customer_idempotency_key_unique" ON "orders" USING btree ("customer_id","idempotency_key");
