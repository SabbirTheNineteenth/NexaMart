CREATE TABLE "service_actors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(64) NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE "order_events" ADD COLUMN "service_actor_id" uuid REFERENCES "service_actors"("id") ON DELETE RESTRICT;
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_n8n_service_actor_check" CHECK ("source" <> 'n8n' OR ("actor_id" IS NULL AND "service_actor_id" IS NOT NULL)) NOT VALID;
CREATE TABLE "service_audit_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "service_actor_id" uuid NOT NULL REFERENCES "service_actors"("id") ON DELETE RESTRICT,
  "action" varchar(100) NOT NULL,
  "resource_type" varchar(80) NOT NULL,
  "resource_id" uuid NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "service_audit_records_created_at_index" ON "service_audit_records" ("created_at");
