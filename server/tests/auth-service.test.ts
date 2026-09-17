import assert from "node:assert/strict";
import test from "node:test";
import { AuthService } from "../src/modules/auth/services/auth-service.js";

test("auth service persists normalized accounts through its repository", async () => {
  let inserted: { name: string; email: string; role: string; passwordHash: string } | undefined;
  const service = new AuthService({
    async findByEmail() { return undefined; },
    async create(input: { name: string; email: string; role: "customer" | "seller" | "admin"; passwordHash: string }) {
      inserted = input;
      return { id: "account-1", ...input, createdAt: new Date().toISOString() };
    },
  });

  const account = await service.register({ name: "  Sabbir  ", email: "SABBIR@EXAMPLE.COM ", password: "secure-pass" });
  assert.equal(account.email, "sabbir@example.com");
  assert.equal(account.role, "customer");
  assert.equal(inserted?.name, "Sabbir");
  assert.notEqual(inserted?.passwordHash, "secure-pass");
});

test("auth service rejects duplicate accounts before writing", async () => {
  let creates = 0;
  const service = new AuthService({
    async findByEmail() { return { id: "existing", name: "Existing", email: "sabbir@example.com", role: "customer" as const, passwordHash: "hash", createdAt: new Date().toISOString() }; },
    async create() { creates += 1; throw new Error("should not create"); },
  });

  await assert.rejects(() => service.register({ name: "Sabbir", email: "sabbir@example.com", password: "secure-pass" }), /already exists/);
  assert.equal(creates, 0);
});
