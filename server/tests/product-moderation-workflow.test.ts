import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../src/db/schema/index.ts", import.meta.url), "utf8");
const routes = readFileSync(new URL("../src/modules/admin/admin-product.routes.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../src/modules/admin/services/admin-product-service.ts", import.meta.url), "utf8");
const repository = readFileSync(new URL("../src/modules/admin/postgres-admin-product.repository.ts", import.meta.url), "utf8");

test("product moderation persists a state, corrective reason, reviewer, and revision", () => {
  assert.match(schema, /productModerationStatus = pgEnum\("product_moderation_status", \["draft", "pending_review", "approved", "rejected", "changes_requested"\]\)/);
  assert.match(schema, /moderationStatus: productModerationStatus\("moderation_status"\)/);
  assert.match(schema, /moderationReason: text\("moderation_reason"\)/);
  assert.match(schema, /moderatedById: uuid\("moderated_by_id"\)/);
  assert.match(schema, /moderatedAt: timestamp\("moderated_at"/);
  assert.match(schema, /moderationRevision: integer\("moderation_revision"\)/);
});

test("admin moderation uses role-protected, exact-revision transitions and audits them in its transaction", () => {
  assert.match(routes, /routes\.patch\("\/:productId\/moderation"/);
  assert.match(routes, /guard\.requireRole\("admin"\)/);
  assert.match(routes, /expectedRevision: z\.string\(\)\.trim\(\)\.min\(1\)/);
  assert.match(service, /async moderate\(/);
  assert.match(service, /this\.inTransaction/);
  assert.match(service, /action: "product\.moderation_changed"/);
  assert.match(repository, /async moderate\(/);
  assert.match(repository, /eq\(products\.updatedAt, sql`\$\{input\.expectedRevision\}::timestamptz`\)/);
  assert.match(repository, /moderationStatus: input\.status/);
  assert.match(repository, /moderationRevision: sql`\$\{products\.moderationRevision\} \+ 1`/);
});

