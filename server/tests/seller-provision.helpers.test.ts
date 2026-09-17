import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { normalizeSellerInput, passwordWithinBcryptLimit, provisionSeller, upsertSellerAndRevokeSessions } from "../src/scripts/seller-provision.helpers.js";

const privatePassword = () => randomBytes(24).toString("base64url");
const bcryptBoundaryPassword = (length: number) => Array.from(randomBytes(length), (byte) => String.fromCodePoint(0x1F600 + byte % 80)).join("");

test("seller provisioning normalizes terminal input and validates profile and bcrypt constraints", async () => {
  assert.deepEqual(normalizeSellerInput({
    name: "  Ada Lovelace ",
    email: " ADA@EXAMPLE.COM ",
    storeName: "  Analytical Engines ",
    storeSlug: " ANALYTICAL-ENGINES ",
    description: "  Demonstrating carefully tested computing tools. ",
  }), {
    name: "Ada Lovelace",
    email: "ada@example.com",
    storeName: "Analytical Engines",
    storeSlug: "analytical-engines",
    description: "Demonstrating carefully tested computing tools.",
  });
  assert.equal(passwordWithinBcryptLimit(bcryptBoundaryPassword(18)), true);
  assert.equal(passwordWithinBcryptLimit(bcryptBoundaryPassword(19)), false);

  const repository = { async upsertSeller() { throw new Error("not reached"); } };
  await assert.rejects(() => provisionSeller({
    name: "Ada",
    email: "ada@example.com",
    storeName: "A",
    storeSlug: "not_a_slug",
    description: "short",
    password: privatePassword(),
  }, repository), /Invalid seller details/);
  await assert.rejects(() => provisionSeller({
    name: "Ada",
    email: "ada@example.com",
    storeName: "Ada Store",
    storeSlug: "ada-store",
    description: "A valid seller description.",
    password: bcryptBoundaryPassword(19),
  }, repository), /72-byte UTF-8 limit/);
});

test("seller provisioning hashes an interactive password and forwards an active seller profile", async () => {
  let received: Record<string, unknown> | undefined;
  const password = privatePassword();
  const result = await provisionSeller({
    name: "  Ada ",
    email: "ADA@EXAMPLE.COM ",
    storeName: "  Ada Store ",
    storeSlug: " ADA-STORE ",
    description: "  A valid seller profile description. ",
    password,
  }, {
    async upsertSeller(input) { received = input; return { id: "seller-1", created: false }; },
  });

  assert.deepEqual(result, { id: "seller-1", created: false });
  assert.deepEqual({
    name: received?.name,
    email: received?.email,
    storeName: received?.storeName,
    storeSlug: received?.storeSlug,
    description: received?.description,
    role: received?.role,
    status: received?.status,
  }, {
    name: "Ada",
    email: "ada@example.com",
    storeName: "Ada Store",
    storeSlug: "ada-store",
    description: "A valid seller profile description.",
    role: "seller",
    status: "active",
  });
  assert.notEqual(received?.passwordHash, password);
});

test("existing seller reprovision updates the account, revokes its sessions, and upserts an active profile atomically", async () => {
  const sessions = [
    { accountId: "seller-1", tokenHash: "seller-session" },
    { accountId: "customer-1", tokenHash: "customer-session" },
  ];
  const calls: string[] = [];
  const transaction = {
    query: { accounts: { async findFirst() { calls.push("find"); return { id: "seller-1" }; } } },
    update() {
      calls.push("update-account");
      return { set() { return { where() { return { async returning() { return [{ id: "seller-1" }]; } }; } }; } };
    },
    delete() {
      calls.push("revoke");
      return { async where() { sessions.splice(0, sessions.length, ...sessions.filter((session) => session.accountId !== "seller-1")); } };
    },
    insert() {
      calls.push("upsert-profile");
      return { values(profile: Record<string, unknown>) { assert.equal(profile.accountId, "seller-1"); assert.equal(profile.status, "active"); return { async onConflictDoUpdate() {} }; } };
    },
  };
  const database = { async transaction(work: (tx: typeof transaction) => Promise<unknown>) { calls.push("begin"); const result = await work(transaction); calls.push("commit"); return result; } };

  const result = await upsertSellerAndRevokeSessions(database as never, {
    name: "Ada", email: "ada@example.com", passwordHash: "hash", role: "seller",
    storeName: "Ada Store", storeSlug: "ada-store", description: "A valid seller profile description.", status: "active",
  });

  assert.deepEqual(result, { id: "seller-1", created: false });
  assert.deepEqual(calls, ["begin", "find", "update-account", "revoke", "upsert-profile", "commit"]);
  assert.deepEqual(sessions, [{ accountId: "customer-1", tokenHash: "customer-session" }]);
});

test("new seller creation adds an active profile without revoking sessions", async () => {
  let revoked = false;
  let profile: Record<string, unknown> | undefined;
  const transaction = {
    query: { accounts: { async findFirst() { return undefined; } } },
    update() { throw new Error("new seller must not update"); },
    delete() { revoked = true; throw new Error("new seller must not revoke sessions"); },
    insert() {
      return {
        values(input: Record<string, unknown>) {
          if ("email" in input) return { async returning() { return [{ id: "seller-2" }]; } };
          profile = input;
          return { async onConflictDoUpdate() {} };
        },
      };
    },
  };
  const database = { async transaction(work: (tx: typeof transaction) => Promise<unknown>) { return work(transaction); } };

  const result = await upsertSellerAndRevokeSessions(database as never, {
    name: "Grace", email: "grace@example.com", passwordHash: "hash", role: "seller",
    storeName: "Grace Store", storeSlug: "grace-store", description: "A valid seller profile description.", status: "active",
  });

  assert.deepEqual(result, { id: "seller-2", created: true });
  assert.equal(revoked, false);
  assert.deepEqual(profile, {
    accountId: "seller-2", storeName: "Grace Store", storeSlug: "grace-store", description: "A valid seller profile description.", status: "active",
  });
});
