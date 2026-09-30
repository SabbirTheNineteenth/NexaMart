CREATE TABLE "customer_telegram_link_challenges" (
  "account_id" uuid PRIMARY KEY REFERENCES "accounts"("id") ON DELETE CASCADE,
  "code_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "customer_telegram_links" (
  "account_id" uuid PRIMARY KEY REFERENCES "accounts"("id") ON DELETE CASCADE,
  "chat_id" varchar(32) NOT NULL UNIQUE,
  "code_hash" varchar(64) NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "cod_outbox" ADD COLUMN "delivery_outcome" varchar(32);
ALTER TABLE "cod_outbox" ADD CONSTRAINT "cod_outbox_delivery_outcome_check"
  CHECK ("delivery_outcome" IS NULL OR "delivery_outcome" IN ('accepted', 'telegram_sent', 'skipped_unlinked'));
