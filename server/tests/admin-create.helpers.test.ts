import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAdminInput, passwordWithinBcryptLimit, provisionAdmin, upsertAdminAndRevokeSessions } from "../src/scripts/admin-create.helpers.js";

test("admin provisioning normalizes input and rejects invalid password byte lengths", () => {
  assert.deepEqual(normalizeAdminInput({ name: "  Ada Lovelace ", email: " ADA@EXAMPLE.COM " }), { name: "Ada Lovelace", email: "ada@example.com" });
  assert.equal(passwordWithinBcryptLimit("🙂".repeat(18)), true);
  assert.equal(passwordWithinBcryptLimit("🙂".repeat(19)), false);
});

test("admin provisioning hashes a terminal password and upserts by normalized email", async () => {
  let received: { name: string; email: string; passwordHash: string; role: "admin" } | undefined;
  const result = await provisionAdmin({ name: "  Ada ", email: "ADA@EXAMPLE.COM ", password: "correct horse battery staple" }, {
    async upsertAdmin(input) { received = input; return { id: "admin-1", created: false }; },
  });

  assert.deepEqual(result, { id: "admin-1", created: false });
  assert.deepEqual({ name: received?.name, email: received?.email, role: received?.role }, { name: "Ada", email: "ada@example.com", role: "admin" });
  assert.notEqual(received?.passwordHash, "correct horse battery staple");
  await assert.rejects(() => provisionAdmin({ name: "Ada", email: "ada@example.com", password: "🙂".repeat(19) }, { async upsertAdmin() { throw new Error("not reached"); } }), /72-byte UTF-8 limit/);
});

test("existing admin reprovision updates the account and revokes only that account's sessions in one transaction", async () => {
  const sessions = [
    { accountId: "admin-1", tokenHash: "old-admin-session" },
    { accountId: "customer-1", tokenHash: "customer-session" },
  ];
  const calls: string[] = [];
  const transaction = {
    query: { accounts: { async findFirst() { calls.push("find"); return { id: "admin-1" }; } } },
    update() {
      calls.push("update");
      return {
        set() {
          return {
            where() {
              return { async returning() { return [{ id: "admin-1" }]; } };
            },
          };
        },
      };
    },
    delete() {
      calls.push("revoke");
      return { async where() { sessions.splice(0, sessions.length, ...sessions.filter((session) => session.accountId !== "admin-1")); } };
    },
    insert() { throw new Error("existing admin must not be inserted"); },
  };
  const database = { async transaction(work: (tx: typeof transaction) => Promise<unknown>) { calls.push("begin"); const result = await work(transaction); calls.push("commit"); return result; } };

  const result = await upsertAdminAndRevokeSessions(database as never, { name: "Ada", email: "ada@example.com", passwordHash: "hash", role: "admin" });

  assert.deepEqual(result, { id: "admin-1", created: false });
  assert.deepEqual(calls, ["begin", "find", "update", "revoke", "commit"]);
  assert.deepEqual(sessions, [{ accountId: "customer-1", tokenHash: "customer-session" }]);
});

test("new admin creation does not revoke any account sessions", async () => {
  let revoked = false;
  const transaction = {
    query: { accounts: { async findFirst() { return undefined; } } },
    update() { throw new Error("new admin must not be updated"); },
    delete() { revoked = true; throw new Error("new admin must not revoke sessions"); },
    insert() { return { values() { return { async returning() { return [{ id: "admin-2" }]; } }; } }; },
  };
  const database = { async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); } };

  const result = await upsertAdminAndRevokeSessions(database as never, { name: "Grace", email: "grace@example.com", passwordHash: "hash", role: "admin" });

  assert.deepEqual(result, { id: "admin-2", created: true });
  assert.equal(revoked, false);
});
