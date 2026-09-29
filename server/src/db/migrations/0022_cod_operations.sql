ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'collected';
ALTER TYPE "fulfillment_status" ADD VALUE IF NOT EXISTS 'failed_delivery';
ALTER TYPE "fulfillment_status" ADD VALUE IF NOT EXISTS 'return_requested';
ALTER TABLE "orders" ADD COLUMN "payment_method" varchar(16) NOT NULL DEFAULT 'cod';
ALTER TABLE "orders" ADD CONSTRAINT "orders_cod_payment_method_check" CHECK ("payment_method" = 'cod');
ALTER TABLE "order_items" ADD COLUMN "cod_collected_at" timestamptz;
ALTER TABLE "order_events" ADD COLUMN "source" varchar(16) NOT NULL DEFAULT 'account';
ALTER TABLE "order_events" ADD COLUMN "external_event_id" varchar(128);
CREATE UNIQUE INDEX "order_events_external_event_id_unique" ON "order_events" ("external_event_id") WHERE "external_event_id" IS NOT NULL;
CREATE TABLE "cod_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "next_attempt_at" timestamptz NOT NULL DEFAULT now(),
  "delivered_at" timestamptz,
  "last_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "cod_outbox_pending_index" ON "cod_outbox" ("delivered_at", "next_attempt_at");
