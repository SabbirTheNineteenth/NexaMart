import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createAdminCategoryRoutes } from "../src/modules/admin/admin-category.routes.js";
import { AdminCategoryService } from "../src/modules/admin/services/admin-category-service.js";

const admin = { id: "admin-1", name: "Ada", email: "ada@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...admin, id: "customer-1", role: "customer" as const };
const categories = [{ id: "category-1", name: "Audio", slug: "audio", createdAt: "2026-09-10T00:00:00.000Z" }];

type Calls = { create?: unknown; update?: unknown };
type CategoryOverrides = Partial<{
  list(): Promise<unknown>;
  create(input: unknown): Promise<unknown>;
  update(input: unknown): Promise<unknown>;
}>;

function makeApp(account = admin, overrides: CategoryOverrides = {}) {
  const calls: Calls = {};
  const routes = createAdminCategoryRoutes({
    sessions: { async resolve() { return account; } },
    categories: {
      async list() { return categories; },
      async create(input: unknown) { calls.create = input; const { adminId: _adminId, ...category } = input as { adminId: string }; return { id: "category-2", createdAt: "2026-09-12T00:00:00.000Z", ...category }; },
      async update(input: unknown) { calls.update = input; const { adminId: _adminId, ...category } = input as { adminId: string }; return { createdAt: categories[0].createdAt, ...category }; },
      ...overrides,
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/admin/categories", routes);
  return { app, calls };
}

const authHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" };

test("admin category routes list and create schema-backed category details", async () => {
  const { app, calls } = makeApp();
  const list = await app.request("http://localhost/api/admin/categories", { headers: authHeaders });
  const create = await app.request("http://localhost/api/admin/categories", {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ name: " Home Office ", slug: "home-office", adminId: "attacker" }),
  });

  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { categories });
  assert.equal(create.status, 201);
  assert.deepEqual(calls.create, { name: "Home Office", slug: "home-office", adminId: admin.id });
  assert.deepEqual(await create.json(), { category: { id: "category-2", name: "Home Office", slug: "home-office", createdAt: "2026-09-12T00:00:00.000Z" } });
});

test("admin category list hides unexpected persistence errors", async () => {
  const { app } = makeApp(admin, { async list() { throw new Error("postgres://admin:super-secret@db.internal connection refused"); } });
  const response = await app.request("http://localhost/api/admin/categories", { headers: authHeaders });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to list categories" });
});

test("admin category routes update only validated category details", async () => {
  const { app, calls } = makeApp();
  const response = await app.request("http://localhost/api/admin/categories/category-1", {
    method: "PATCH", headers: authHeaders,
    body: JSON.stringify({ name: "Sound & Audio", slug: "sound-audio", id: "attacker" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls.update, { id: "category-1", name: "Sound & Audio", slug: "sound-audio", adminId: admin.id });
  assert.deepEqual(await response.json(), { category: { id: "category-1", name: "Sound & Audio", slug: "sound-audio", createdAt: "2026-09-10T00:00:00.000Z" } });
});

test("admin category routes reject invalid category details", async () => {
  const { app } = makeApp();
  const response = await app.request("http://localhost/api/admin/categories", {
    method: "POST", headers: authHeaders, body: JSON.stringify({ name: "", slug: "Not A Slug" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid category" });
});

test("admin category routes reject missing or non-admin opaque sessions", async () => {
  const missing = await makeApp().app.request("http://localhost/api/admin/categories");
  const forbidden = await makeApp(customer).app.request("http://localhost/api/admin/categories", { headers: authHeaders });

  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), { error: "Authentication required" });
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: "Forbidden" });
});

test("admin category routes return safe conflicts for duplicate slugs", async () => {
  const { app } = makeApp(admin, { async create() { throw new Error("Category slug already exists"); } });
  const response = await app.request("http://localhost/api/admin/categories", {
    method: "POST", headers: authHeaders, body: JSON.stringify({ name: "Audio Two", slug: "audio" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Category slug already exists" });
});

test("admin category creation appends a sanitized audit record after a successful atomic mutation", async () => {
  let auditInput: unknown;
  const service = new AdminCategoryService({
    async list() { return []; },
    async findBySlug() { return null; },
    async create(input) { return { id: "category-2", ...input, createdAt: "2026-09-12T00:00:00.000Z" }; },
    async update() { return null; },
    async withTransaction(work) { return work(this, undefined as never); },
  }, { async record(input) { auditInput = input; } });

  await service.create({ name: "Home Office", slug: "home-office", adminId: admin.id });

  assert.deepEqual(auditInput, {
    actorId: admin.id,
    action: "category.created",
    resourceType: "category",
    resourceId: "category-2",
    metadata: { name: "Home Office", slug: "home-office" },
  });
});

test("admin category updates append only changed-field audit metadata after a successful atomic mutation", async () => {
  let auditInput: unknown;
  const service = new AdminCategoryService({
    async list() { return []; },
    async findBySlug() { return null; },
    async create() { throw new Error("not reached"); },
    async update(input) { return { id: input.id, name: input.name ?? "Audio", slug: input.slug ?? "audio", createdAt: "2026-09-10T00:00:00.000Z" }; },
    async withTransaction(work) { return work(this, undefined as never); },
  }, { async record(input) { auditInput = input; } });

  await service.update({ id: "category-1", name: "Sound & Audio", adminId: admin.id });

  assert.deepEqual(auditInput, {
    actorId: admin.id,
    action: "category.updated",
    resourceType: "category",
    resourceId: "category-1",
    metadata: { fields: ["name"] },
  });
});

test("category persistence conflicts and missing updates do not append audit records", async () => {
  let auditCalls = 0;
  const audit = { async record() { auditCalls += 1; } };
  const conflict = new AdminCategoryService({
    async list() { return []; },
    async findBySlug() { return { id: "category-1" }; },
    async create() { throw new Error("not reached"); },
    async update() { throw new Error("not reached"); },
    async withTransaction(work) { return work(this, undefined as never); },
  }, audit);
  const missing = new AdminCategoryService({
    async list() { return []; },
    async findBySlug() { return null; },
    async create() { throw new Error("not reached"); },
    async update() { return null; },
    async withTransaction(work) { return work(this, undefined as never); },
  }, audit);

  await assert.rejects(() => conflict.create({ name: "Audio", slug: "audio", adminId: admin.id }), /Category slug already exists/);
  await assert.rejects(() => missing.update({ id: "missing", name: "Audio", adminId: admin.id }), /Category not found/);
  assert.equal(auditCalls, 0);
});

test("category create rejects before mutation when audit dependency is unavailable", async () => {
  let createCalls = 0;
  const service = new AdminCategoryService({
    async list() { return []; },
    async findBySlug() { return null; },
    async create(input) { createCalls += 1; return { id: "category-2", ...input, createdAt: "2026-09-12T00:00:00.000Z" }; },
    async update() { return null; },
  }, undefined as never);

  await assert.rejects(() => service.create({ name: "Home Office", slug: "home-office", adminId: admin.id }), /audit/i);
  assert.equal(createCalls, 0);
});

test("category create rejects before mutation when transaction support is unavailable", async () => {
  let createCalls = 0;
  const service = new AdminCategoryService({
    async list() { return []; },
    async findBySlug() { return null; },
    async create(input) { createCalls += 1; return { id: "category-2", ...input, createdAt: "2026-09-12T00:00:00.000Z" }; },
    async update() { return null; },
  }, { async record() {} });

  await assert.rejects(() => service.create({ name: "Home Office", slug: "home-office", adminId: admin.id }), /transaction/i);
  assert.equal(createCalls, 0);
});

test("category create and update roll back when audit append fails", async () => {
  const transaction = {};
  const persisted = { create: false, update: false };
  const repository = {
    async list() { return []; },
    async findBySlug() { return null; },
    async create(input: { name: string; slug: string }) { persisted.create = true; return { id: "category-2", ...input, createdAt: "2026-09-12T00:00:00.000Z" }; },
    async update(input: { id: string; name?: string; slug?: string }) { persisted.update = true; return { id: input.id, name: input.name ?? "Audio", slug: input.slug ?? "audio", createdAt: "2026-09-10T00:00:00.000Z" }; },
    async withTransaction(work: any) {
      try { return await work(repository, transaction); } catch (error) { persisted.create = false; persisted.update = false; throw error; }
    },
  };
  const databases: unknown[] = [];
  const service = new AdminCategoryService(repository, { async record(_input, database) { databases.push(database); throw new Error("audit unavailable"); } });

  await assert.rejects(() => service.create({ name: "Home Office", slug: "home-office", adminId: admin.id }), /audit unavailable/);
  await assert.rejects(() => service.update({ id: "category-1", name: "Sound & Audio", adminId: admin.id }), /audit unavailable/);
  assert.deepEqual(databases, [transaction, transaction]);
  assert.deepEqual(persisted, { create: false, update: false });
});

test("application wires protected admin category management", () => {
  const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");
  assert.match(source, /new AdminCategoryService\(new PostgresAdminCategoryRepository\(\), auditService\)/);
  assert.match(source, /app\.route\("\/admin\/categories", createAdminCategoryRoutes\(\{ sessions: sessionService, categories: adminCategoryService \}\)\)/);
});
