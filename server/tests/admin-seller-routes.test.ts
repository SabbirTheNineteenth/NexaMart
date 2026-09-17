import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createAdminSellerRoutes } from "../src/modules/admin/admin-seller.routes.js";
import { AdminSellerService } from "../src/modules/admin/services/admin-seller-service.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...admin, id: "customer-1", role: "customer" as const };

function makeApp(account = admin, sellers = {
  async list() { return []; },
  async transition() { return { id: "11111111-1111-4111-8111-111111111111", accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: "active" as const, createdAt: "2026-09-11T00:00:00.000Z" }; },
}) {
  const routes = createAdminSellerRoutes({ sessions: { async resolve() { return account; } }, sellers });
  const app = new Hono().basePath("/api");
  app.route("/admin/sellers", routes);
  return app;
}

test("admin seller list hides unexpected persistence errors", async () => {
  const app = makeApp(admin, {
    async list() { throw new Error("postgres://admin:super-secret@db.internal connection refused"); },
    async transition() { return { id: "11111111-1111-4111-8111-111111111111", accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: "active" as const, createdAt: "2026-09-11T00:00:00.000Z" }; },
  });
  const response = await app.request("http://localhost/api/admin/sellers", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to list sellers" });
});

test("admin seller approval transitions only the targeted profile using the server-defined active state", async () => {
  let received: { sellerProfileId: string; action: "approve" | "reject" | "suspend" | "activate"; adminId: string } | undefined;
  const app = makeApp(admin, {
    async list() { return []; },
    async transition(input) { received = input; return { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: "active" as const, createdAt: "2026-09-11T00:00:00.000Z" }; },
  });

  const response = await app.request("http://localhost/api/admin/sellers/11111111-1111-4111-8111-111111111111/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ action: "approve", status: "suspended", adminId: "attacker" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id });
  assert.deepEqual(await response.json(), { seller: { id: "11111111-1111-4111-8111-111111111111", accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: "active", createdAt: "2026-09-11T00:00:00.000Z" } });
});

test("seller moderation endpoints reject non-admin accounts", async () => {
  const response = await makeApp(customer).request("http://localhost/api/admin/sellers/11111111-1111-4111-8111-111111111111/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" },
    body: JSON.stringify({ action: "approve" }),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("seller moderation rejects malformed profile identifiers before invoking lifecycle mutation", async () => {
  let transitions = 0;
  const app = makeApp(admin, {
    async list() { return []; },
    async transition() { transitions += 1; throw new Error("unexpected"); },
  });

  const response = await app.request("http://localhost/api/admin/sellers/not-a-uuid/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ action: "approve" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid seller application" });
  assert.equal(transitions, 0);
});

test("seller moderation keeps malformed JSON on its established validation contract", async () => {
  let transitions = 0;
  const app = makeApp(admin, {
    async list() { return []; },
    async transition() { transitions += 1; throw new Error("not reached"); },
  });

  const response = await app.request("http://localhost/api/admin/sellers/11111111-1111-4111-8111-111111111111/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid seller action" });
  assert.equal(transitions, 0);
});

test("seller moderation preserves the missing seller profile conflict contract", async () => {
  const app = makeApp(admin, {
    async list() { return []; },
    async transition() { throw new Error("Seller application not found"); },
  });

  const response = await app.request("http://localhost/api/admin/sellers/22222222-2222-4222-8222-222222222222/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ action: "approve" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Seller application not found" });
});

test("seller moderation returns a safe conflict for a stale direct PATCH", async () => {
  const app = makeApp(admin, {
    async list() { return []; },
    async transition() { throw new Error("Seller transition is no longer available"); },
  });

  const response = await app.request("http://localhost/api/admin/sellers/11111111-1111-4111-8111-111111111111/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ action: "approve" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Seller transition is no longer available" });
});

test("seller moderation hides unexpected persistence errors", async () => {
  const app = makeApp(admin, {
    async list() { return []; },
    async transition() { throw new Error("postgres://admin:super-secret@db.internal connection refused"); },
  });

  const response = await app.request("http://localhost/api/admin/sellers/11111111-1111-4111-8111-111111111111/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ action: "approve" }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to update seller" });
});

test("seller moderation rejects before mutating when an alternate repository lacks transaction support", async () => {
  let transitions = 0;
  const service = new AdminSellerService({
    async list() { return []; },
    async transition() {
      transitions += 1;
      return { id: "11111111-1111-4111-8111-111111111111", accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: "active" as const, createdAt: "2026-09-11T00:00:00.000Z" };
    },
  }, {
    async record() {},
  });

  await assert.rejects(
    () => service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id }),
    /Transaction support is required for audited mutations/,
  );
  assert.equal(transitions, 0);
});

test("seller moderation rejects before mutating when audit support is unavailable", async () => {
  let transitions = 0;
  const transaction = {};
  const repository = {
    async list() { return []; },
    async transition() {
      transitions += 1;
      return { id: "11111111-1111-4111-8111-111111111111", accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: "active" as const, createdAt: "2026-09-11T00:00:00.000Z" };
    },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new AdminSellerService(repository, undefined);

  await assert.rejects(
    () => service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id }),
    /Audit support is required for moderated seller mutations/,
  );
  assert.equal(transitions, 0);
});

test("seller moderation appends only a session-derived safe audit record after persistence", async () => {
  const calls: string[] = [];
  let auditInput: unknown;
  const transaction = {};
  const repository = {
    async list() { return []; },
    async transition(input) {
      calls.push("persist");
      return { kind: "updated" as const, seller: { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: input.nextStatus, createdAt: "2026-09-11T00:00:00.000Z" } };
    },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new AdminSellerService(repository, {
    async record(input) { calls.push("audit"); auditInput = input; },
  });

  await service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "suspend", adminId: admin.id });

  assert.deepEqual(calls, ["persist", "audit"]);
  assert.deepEqual(auditInput, {
    actorId: admin.id,
    action: "seller.status_changed",
    resourceType: "seller_profile",
    resourceId: "11111111-1111-4111-8111-111111111111",
    metadata: { action: "suspend", status: "suspended" },
  });
});

test("seller moderation rejects a suspended approval without profile, role, or audit changes", async () => {
  let status = "suspended";
  let role = "customer";
  let auditCalls = 0;
  const transaction = {};
  const repository = {
    async list() { return []; },
    async transition(input: any) {
      if (!input.expectedStatuses?.includes(status)) return { kind: "invalid_state" as const };
      status = input.nextStatus;
      role = input.sellerRole;
      return { kind: "updated" as const, seller: { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status, createdAt: "2026-09-11T00:00:00.000Z" } };
    },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new AdminSellerService(repository, { async record() { auditCalls += 1; } });

  await assert.rejects(
    () => service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id }),
    /Seller transition is no longer available/,
  );
  assert.equal(status, "suspended");
  assert.equal(role, "customer");
  assert.equal(auditCalls, 0);
});

test("seller moderation rejects every disallowed action without role or audit side effects", async () => {
  const invalidCases = [
    { status: "active", action: "approve" },
    { status: "active", action: "reject" },
    { status: "active", action: "activate" },
    { status: "pending", action: "suspend" },
    { status: "pending", action: "activate" },
  ] as const;

  for (const invalidCase of invalidCases) {
    let status = invalidCase.status;
    let role = status === "active" ? "seller" : "customer";
    let auditCalls = 0;
    const transaction = {};
    const repository = {
      async list() { return []; },
      async transition(input: any) {
        if (!input.expectedStatuses.includes(status)) return { kind: "invalid_state" as const };
        status = input.nextStatus;
        role = input.sellerRole;
        return { kind: "updated" as const, seller: { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status, createdAt: "2026-09-11T00:00:00.000Z" } };
      },
      async withTransaction(work: any) { return work(repository, transaction); },
    };
    const service = new AdminSellerService(repository, { async record() { auditCalls += 1; } });

    await assert.rejects(() => service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: invalidCase.action, adminId: admin.id }), /Seller transition is no longer available/);
    assert.equal(status, invalidCase.status);
    assert.equal(role, invalidCase.status === "active" ? "seller" : "customer");
    assert.equal(auditCalls, 0);
  }
});

test("seller moderation completes every action offered by the UI and audits it once", async () => {
  const allowedCases = [
    { status: "pending", action: "approve", nextStatus: "active", nextRole: "seller" },
    { status: "pending", action: "reject", nextStatus: "rejected", nextRole: "customer" },
    { status: "approved", action: "activate", nextStatus: "active", nextRole: "seller" },
    { status: "active", action: "suspend", nextStatus: "suspended", nextRole: "customer" },
    { status: "suspended", action: "activate", nextStatus: "active", nextRole: "seller" },
    { status: "rejected", action: "activate", nextStatus: "active", nextRole: "seller" },
  ] as const;

  for (const allowedCase of allowedCases) {
    let status = allowedCase.status;
    let role = status === "active" ? "seller" : "customer";
    let auditCalls = 0;
    const transaction = {};
    const repository = {
      async list() { return []; },
      async transition(input: any) {
        if (!input.expectedStatuses.includes(status)) return { kind: "invalid_state" as const };
        status = input.nextStatus;
        role = input.sellerRole;
        return { kind: "updated" as const, seller: { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status, createdAt: "2026-09-11T00:00:00.000Z" } };
      },
      async withTransaction(work: any) { return work(repository, transaction); },
    };
    const service = new AdminSellerService(repository, { async record() { auditCalls += 1; } });

    const seller = await service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: allowedCase.action, adminId: admin.id });
    assert.equal(seller.status, allowedCase.nextStatus);
    assert.equal(status, allowedCase.nextStatus);
    assert.equal(role, allowedCase.nextRole);
    assert.equal(auditCalls, 1);
  }
});

test("concurrent seller moderation attempts from the same source state audit only one atomic transition", async () => {
  let status = "pending";
  let role = "customer";
  let auditCalls = 0;
  const transaction = {};
  const repository = {
    async list() { return []; },
    async transition(input: any) {
      await Promise.resolve();
      if (!input.expectedStatuses.includes(status)) return { kind: "invalid_state" as const };
      status = input.nextStatus;
      role = input.sellerRole;
      return { kind: "updated" as const, seller: { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status, createdAt: "2026-09-11T00:00:00.000Z" } };
    },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new AdminSellerService(repository, { async record() { auditCalls += 1; } });

  const results = await Promise.allSettled([
    service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id }),
    service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id }),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(status, "active");
  assert.equal(role, "seller");
  assert.equal(auditCalls, 1);
});

test("seller moderation does not append an audit record when persistence fails", async () => {
  let auditCalls = 0;
  const transaction = {};
  const repository = {
    async list() { return []; },
    async transition() { return { kind: "not_found" as const }; },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new AdminSellerService(repository, {
    async record() { auditCalls += 1; },
  });

  await assert.rejects(() => service.transition({ sellerProfileId: "missing", action: "approve", adminId: admin.id }), /Seller application not found/);
  assert.equal(auditCalls, 0);
});

test("seller moderation rolls back its profile and role mutation when the audit append fails", async () => {
  let persisted = false;
  const transaction = {};
  let auditDatabase: unknown;
  const repository = {
    async list() { return []; },
    async transition(input: any) { persisted = true; return { kind: "updated" as const, seller: { id: input.sellerProfileId, accountId: "seller-1", storeName: "Studio", storeSlug: "studio", status: input.nextStatus, createdAt: "2026-09-11T00:00:00.000Z" } }; },
    async withTransaction(work: any) {
      try { return await work(repository, transaction); } catch (error) { persisted = false; throw error; }
    },
  };
  const service = new AdminSellerService(repository, { async record(_input, database) { auditDatabase = database; throw new Error("audit unavailable"); } });

  await assert.rejects(() => service.transition({ sellerProfileId: "11111111-1111-4111-8111-111111111111", action: "approve", adminId: admin.id }), /audit unavailable/);
  assert.equal(auditDatabase, transaction);
  assert.equal(persisted, false);
});

test("application wires seller moderation to the audit service", () => {
  const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");
  assert.match(source, /new AdminSellerService\(new PostgresAdminSellerRepository\(\), auditService\)/);
});
