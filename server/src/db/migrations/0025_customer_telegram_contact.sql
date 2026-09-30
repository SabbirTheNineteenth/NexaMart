CREATE TABLE "customer_telegram_contacts" (
  "account_id" uuid PRIMARY KEY REFERENCES "accounts"("id") ON DELETE CASCADE,
  "phone" varchar(16) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "customer_telegram_contacts_phone_check" CHECK ("phone" ~ '^\+[1-9][0-9]{7,14}$')
);

ALTER TABLE "customer_telegram_link_challenges" ADD COLUMN "last_error" varchar(16);
ALTER TABLE "customer_telegram_link_challenges" ADD CONSTRAINT "customer_telegram_link_challenges_last_error_check"
  CHECK ("last_error" IS NULL OR "last_error" = 'chat_in_use');
