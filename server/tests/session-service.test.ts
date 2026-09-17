import assert from "node:assert/strict";
import test from "node:test";
import { SessionService } from "../src/modules/auth/services/session-service.js";

test("session service returns an opaque token and stores only its hash", async () => {
  let stored: { accountId: string; tokenHash: string; expiresAt: Date } | undefined;
  const now = new Date("2026-09-11T00:00:00.000Z");
  const service = new SessionService({
    async store(input: { accountId: string; tokenHash: string; expiresAt: Date }) { stored = input; },
    async findAccountByTokenHash() { return null; },
    async revokeByTokenHash() {},
  }, () => now);

  const session = await service.create("account-1");
  assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(stored?.accountId, "account-1");
  assert.notEqual(stored?.tokenHash, session.token);
  assert.equal(stored?.tokenHash.length, 64);
  assert.equal(session.expiresAt.toISOString(), "2026-09-18T00:00:00.000Z");
});

test("session service resolves an account using only a hashed token lookup", async () => {
  let receivedHash = "";
  const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
  const service = new SessionService({
    async store() {},
    async findAccountByTokenHash(tokenHash: string) { receivedHash = tokenHash; return account; },
  });

  const resolved = await service.resolve("raw-session-token");
  assert.deepEqual(resolved, account);
  assert.notEqual(receivedHash, "raw-session-token");
  assert.equal(receivedHash.length, 64);
});

test("session service revokes using only the token hash", async () => {
  let receivedHash = "";
  const service = new SessionService({
    async store() {},
    async findAccountByTokenHash() { return null; },
    async revokeByTokenHash(tokenHash: string) { receivedHash = tokenHash; },
  });

  await service.revoke("raw-session-token");
  assert.notEqual(receivedHash, "raw-session-token");
  assert.equal(receivedHash.length, 64);
});

test("session service exposes account-wide revocation without changing token-specific logout", async () => {
  let revokedAccountId = "";
  const service = new SessionService({
    async store() {},
    async findAccountByTokenHash() { return null; },
    async revokeByTokenHash() {},
    async revokeByAccountId(accountId: string) { revokedAccountId = accountId; },
  } as never);

  await service.revokeAccount("account-1");
  assert.equal(revokedAccountId, "account-1");
});
