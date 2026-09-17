ALTER TABLE "order_events" ADD COLUMN "sequence" integer;--> statement-breakpoint
WITH numbered_events AS (
  SELECT "id", row_number() OVER (PARTITION BY "order_id" ORDER BY "created_at" ASC, "id" ASC) AS "sequence"
  FROM "order_events"
)
UPDATE "order_events" AS event
SET "sequence" = numbered_events."sequence"
FROM numbered_events
WHERE event."id" = numbered_events."id";--> statement-breakpoint
ALTER TABLE "order_events" ALTER COLUMN "sequence" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "order_events_order_sequence_unique" ON "order_events" USING btree ("order_id","sequence");
