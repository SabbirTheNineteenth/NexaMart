import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/audit/postgres-audit.repository.ts", import.meta.url), "utf8");

test("audit repository applies optional action and resource type filters with parameterized Drizzle conditions", () => {
  assert.match(source, /import \{ and, desc, eq \} from "drizzle-orm"/);
  assert.match(source, /eq\(auditRecords\.action, filters\.action\)/);
  assert.match(source, /eq\(auditRecords\.resourceType, filters\.resourceType\)/);
  assert.match(source, /\.where\(conditions\)/);
  assert.match(source, /\.orderBy\(desc\(auditRecords\.createdAt\)\)\.limit\(filters\.limit\)/);
});

test("audit repository keeps browsing queries read-only and preserves the append-only writer", () => {
  assert.match(source, /db\.insert\(auditRecords\)\.values\(input\)\.returning\(\)/);
  assert.doesNotMatch(source, /\.(?:update|delete)\(\s*auditRecords\s*\)/);
});
