import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createAdminProductRoutes } from "../src/modules/admin/admin-product.routes.js";
import type { AdminProductRepository } from "../src/modules/admin/admin-product.repository.js";
import { AdminProductService } from "../src/modules/admin/services/admin-product-service.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...admin, id: "seller-1", role: "seller" as const };
const product = {
  id: "product-1", slug: "studio-lamp", name: "Studio Lamp", brand: "Nexa", primaryImageUrl: "https://cdn.example/studio-lamp.jpg",
  price: 89, stock: 3, isPublished: true,
  category: { id: "category-1", name: "Lighting", slug: "lighting" },
  seller: { id: "seller-1", name: "Seller", storeName: "Bright Home", storeSlug: "bright-home", status: "active" as const },
  createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z", expectedRevision: "2026-09-12T00:00:00.123456+00",
};

function makeApp(account: typeof admin | typeof seller | null = admin, products = { async setPublication() { return product; } }) {
  const app = new Hono().basePath("/api");
  app.route("/admin/products", createAdminProductRoutes({ sessions: { async resolve() { return account; } }, products }));
  return app;
}

const headers = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-admin-session" };

test("admin product publication moderation derives actor from opaque admin session and returns safe updated context", async () => {
  let received: unknown;
  const app = makeApp(admin, { async setPublication(input) { received = input; return product; } });

  const response = await app.request("http://localhost/api/admin/products/product-1/publication", {
    method: "PATCH", headers,
    body: JSON.stringify({ isPublished: true, adminId: "attacker", sellerId: "attacker", stock: 999, price: 0, categoryId: "other", name: "Attacker", status: "published" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid product publication" });
  assert.equal(received, undefined);

  const success = await app.request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: true, expectedRevision: product.expectedRevision }) });
  assert.equal(success.status, 200);
  assert.deepEqual(received, { productId: product.id, isPublished: true, expectedRevision: product.expectedRevision, adminId: admin.id });
  const successBody = await success.json();
  assert.deepEqual(successBody, { product });
  assert.equal(JSON.stringify(successBody).includes("email"), false);
  assert.equal(JSON.stringify(product).includes("passwordHash"), false);
});

test("admin product publication moderation rejects malformed, missing, and non-admin sessions", async () => {
  const malformed = await makeApp().request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: "true" }) });
  const missing = await makeApp().request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: true }) });
  const forbidden = await makeApp(seller).request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: true }) });

  assert.equal(malformed.status, 400);
  assert.equal(missing.status, 401);
  assert.equal(forbidden.status, 403);
});

test("admin product publication moderation returns 404 only when the atomic update finds no product", async () => {
  const response = await makeApp(admin, { async setPublication() { throw new Error("Product not found"); } }).request("http://localhost/api/admin/products/missing/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: false, expectedRevision: product.expectedRevision }) });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Product not found" });
});

test("admin product publication service appends a safe audit record only after a successful atomic update", async () => {
  let auditInput: unknown;
  const repository = {
    async setPublication(input: { isPublished: boolean }) { return { kind: "updated" as const, product: { ...product, isPublished: input.isPublished } }; },
    async withTransaction(work: any) { return work(this, {}); },
  };
  const service = new AdminProductService(repository, { async record(input) { auditInput = input; } });
  const updated = await service.setPublication({ productId: product.id, isPublished: false, adminId: admin.id });

  assert.equal(updated.isPublished, false);
  assert.deepEqual(auditInput, { actorId: admin.id, action: "product.publication_changed", resourceType: "product", resourceId: product.id, metadata: { isPublished: false } });

  auditInput = undefined;
  const missingRepository = {
    async setPublication() { return { kind: "not_found" as const }; },
    async withTransaction(work: any) { return work(this, {}); },
  };
  const missing = new AdminProductService(missingRepository, { async record(input) { auditInput = input; } });
  await assert.rejects(() => missing.setPublication({ productId: "missing", isPublished: true, adminId: admin.id }), /Product not found/);
  assert.equal(auditInput, undefined);
});

test("admin product publication rejects missing audit or transaction support before changing publication", async () => {
  let changedWithoutTransaction = false;
  const withoutTransaction = new AdminProductService({
    async setPublication() { changedWithoutTransaction = true; return product; },
  } as unknown as AdminProductRepository, { async record() {} });
  await assert.rejects(() => withoutTransaction.setPublication({ productId: product.id, isPublished: true, adminId: admin.id }), /Transaction support is required for audited mutations/);
  assert.equal(changedWithoutTransaction, false);

  let changedWithoutAudit = false;
  const repository = {
    async setPublication() { changedWithoutAudit = true; return product; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const withoutAudit = new AdminProductService(repository, undefined as never);
  await assert.rejects(() => withoutAudit.setPublication({ productId: product.id, isPublished: false, adminId: admin.id }), /Audit support is required for moderated product mutations/);
  assert.equal(changedWithoutAudit, false);
});

test("admin product publication rolls back when its audit append fails", async () => {
  let persisted = false;
  const transaction = {};
  let auditDatabase: unknown;
  const repository = {
    async setPublication(input: any) { persisted = true; return { ...product, isPublished: input.isPublished }; },
    async withTransaction(work: any) {
      try { return await work(repository, transaction); } catch (error) { persisted = false; throw error; }
    },
  };
  const service = new AdminProductService(repository, { async record(_input, database) { auditDatabase = database; throw new Error("audit unavailable"); } });

  await assert.rejects(() => service.setPublication({ productId: product.id, isPublished: false, adminId: admin.id }), /audit unavailable/);
  assert.equal(auditDatabase, transaction);
  assert.equal(persisted, false);
});

test("admin product publication rejects taxonomy-ineligible products without auditing", async () => {
  let auditRecorded = false;
  const repository = {
    async setPublication() { return { kind: "ineligible" as const }; },
    async withTransaction(work: any) { return work(this, {}); },
  };
  const service = new AdminProductService(repository as any, { async record() { auditRecorded = true; } });

  await assert.rejects(() => service.setPublication({ productId: product.id, isPublished: true, expectedRevision: product.expectedRevision, adminId: admin.id }), /Product taxonomy is not eligible for publication/);
  assert.equal(auditRecorded, false);

  const response = await makeApp(admin, { async setPublication() { throw new Error("Product taxonomy is not eligible for publication"); } }).request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: true, expectedRevision: product.expectedRevision }) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Product taxonomy is not eligible for publication" });
});

test("admin product publication repository atomically requires active consistent canonical taxonomy before publishing", () => {
  const source = readFileSync(new URL("../src/modules/admin/postgres-admin-product.repository.ts", import.meta.url), "utf8");
  const update = source.slice(source.indexOf("const taxonomyEligibility"), source.indexOf("if (!updated)"));
  assert.match(update, /input\.isPublished \? \[[\s\S]*exists\([\s\S]*eq\(categories\.id, products\.categoryId\)[\s\S]*eq\(categories\.isActive, true\)/);
  assert.match(update, /isNull\(products\.subcategoryId\)[\s\S]*exists\([\s\S]*eq\(subcategories\.id, products\.subcategoryId\)[\s\S]*eq\(subcategories\.categoryId, products\.categoryId\)[\s\S]*eq\(subcategories\.isActive, true\)/);
  assert.match(update, /isNull\(products\.brandId\)[\s\S]*exists\([\s\S]*eq\(brands\.id, products\.brandId\)[\s\S]*eq\(brands\.isActive, true\)/);
  assert.match(update, /\.set\(\{ isPublished: input\.isPublished, updatedAt: new Date\(\) \}\)[\s\S]*\.where\(and\([\s\S]*eq\(products\.id, input\.productId\)[\s\S]*eq\(products\.updatedAt, sql`\$\{input\.expectedRevision\}::timestamptz`\)[\s\S]*\.\.\.taxonomyEligibility[\s\S]*\)\)[\s\S]*\.returning\(/);
  assert.doesNotMatch(update.slice(update.indexOf(".set"), update.indexOf(".where")), /sellerId:|stock:|price:|categoryId:|name:|status:|\.insert\(\s*products\s*\)|\.delete\(\s*products\s*\)/);
});

test("application wires protected admin product publication moderation", () => {
  const source = readFileSync(new URL("../src/app.ts", import.meta.url), "utf8");
  assert.match(source, /app\.route\("\/admin\/products", createAdminProductRoutes\(\{ sessions: sessionService, products: adminProductService \}\)\)/);
});

test("admin publication requires a non-empty exact revision and reports stale reviews without auditing", async () => {
  const missingRevision = await makeApp().request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: true }) });
  const blankRevision = await makeApp().request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: true, expectedRevision: "   " }) });
  const stale = await makeApp(admin, { async setPublication() { throw new Error("Product changed; reload and review again."); } }).request("http://localhost/api/admin/products/product-1/publication", { method: "PATCH", headers, body: JSON.stringify({ isPublished: true, expectedRevision: product.expectedRevision }) });

  assert.equal(missingRevision.status, 400);
  assert.equal(blankRevision.status, 400);
  assert.equal(stale.status, 409);
  assert.deepEqual(await stale.json(), { error: "Product changed; reload and review again." });
});

test("admin publication service does not append an audit record for a stale exact revision", async () => {
  let auditRecorded = false;
  const repository = {
    async setPublication() { return { kind: "stale" as const }; },
    async withTransaction(work: any) { return work(this, {}); },
  };
  const service = new AdminProductService(repository as any, { async record() { auditRecorded = true; } });

  await assert.rejects(() => service.setPublication({ productId: product.id, isPublished: true, expectedRevision: product.expectedRevision, adminId: admin.id }), /Product changed; reload and review again\./);
  assert.equal(auditRecorded, false);
});

test("admin publication repository compares the SQL revision token atomically and returns it", () => {
  const source = readFileSync(new URL("../src/modules/admin/postgres-admin-product.repository.ts", import.meta.url), "utf8");
  assert.match(source, /to_char\(\$\{products\.updatedAt\}, 'YYYY-MM-DD"T"HH24:MI:SS\.USOF'\)/);
  assert.match(source, /and\(eq\(products\.id, input\.productId\), eq\(products\.updatedAt, sql`\$\{input\.expectedRevision\}::timestamptz`\), \.\.\.taxonomyEligibility\)/);
  assert.match(source, /expectedRevision:/);
});
