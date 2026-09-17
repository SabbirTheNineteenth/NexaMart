import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/modules/admin/admin.repository.ts", import.meta.url), "utf8");

test("admin account oversight repository reads a bounded safe account projection with optional seller profile status", () => {
  assert.match(source, /async listAccounts\(limit: number\)/);
  assert.match(source, /id: accounts\.id,[\s\S]*name: accounts\.name,[\s\S]*email: accounts\.email,[\s\S]*role: accounts\.role,[\s\S]*createdAt: accounts\.createdAt/);
  assert.match(source, /sellerStoreName: sellerProfiles\.storeName/);
  assert.match(source, /sellerStatus: sellerProfiles\.status/);
  assert.match(source, /leftJoin\(sellerProfiles, eq\(accounts\.id, sellerProfiles\.accountId\)\)/);
  assert.match(source, /orderBy\(desc\(accounts\.createdAt\)\)\.limit\(limit\)/);
});

test("admin account oversight repository is read-only and excludes credentials and session data", () => {
  assert.doesNotMatch(source, /passwordHash|tokenHash|sessions|\.insert\(|\.update\(|\.delete\(/);
});
