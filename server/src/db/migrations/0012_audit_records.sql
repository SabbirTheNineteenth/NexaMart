CREATE TABLE IF NOT EXISTS "audit_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_id" uuid NOT NULL REFERENCES "accounts"("id") ON DELETE RESTRICT,
  "action" varchar(100) NOT NULL,
  "resource_type" varchar(80) NOT NULL,
  "resource_id" uuid NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_records_created_at_index" ON "audit_records" ("created_at");

CREATE OR REPLACE FUNCTION "audit_records_reject_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit records are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "audit_records_append_only" ON "audit_records";
CREATE TRIGGER "audit_records_append_only"
  BEFORE UPDATE OR DELETE ON "audit_records"
  FOR EACH ROW EXECUTE FUNCTION "audit_records_reject_mutation"();
