import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Hono } from "hono";
import { createAdminTaxonomyRoutes } from "../src/modules/taxonomy/admin-taxonomy.routes.js";
import { createSellerTaxonomyRoutes } from "../src/modules/taxonomy/seller-taxonomy.routes.js";
import { TaxonomyConflictError, TaxonomyNotFoundError, TaxonomyValidationError } from "../src/modules/taxonomy/taxonomy.repository.js";
import { TaxonomyService } from "../src/modules/taxonomy/services/taxonomy-service.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-12T00:00:00.000Z" };
const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-12T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };
const headers = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-token" };

test("admin taxonomy routes derive the reviewer identity and reject non-admin canonical creation", async () => {
  let created: unknown;
  const routes = createAdminTaxonomyRoutes({
    sessions: { async resolve() { return admin; } },
    taxonomy: {
      async listCanonical() { return { categories: [], subcategories: [], brands: [] }; },
      async createCanonical(input: unknown) { created = input; return { id: "category-1", ...input as object }; },
      async updateCanonical() { throw new Error("not reached"); },
      async reviewProposal() { throw new Error("not reached"); },
      async listProposals() { return []; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/admin/taxonomy", routes);
  const response = await app.request("http://localhost/api/admin/taxonomy/categories", { method: "POST", headers, body: JSON.stringify({ name: " Audio ", slug: "audio", adminId: "attacker" }) });

  assert.equal(response.status, 201);
  assert.deepEqual(created, { kind: "category", name: "Audio", slug: "audio", adminId: admin.id });

  const forbiddenRoutes = createAdminTaxonomyRoutes({ sessions: { async resolve() { return customer; } }, taxonomy: { async listCanonical() { return { categories: [], subcategories: [], brands: [] }; }, async createCanonical() { throw new Error("not reached"); }, async updateCanonical() { throw new Error("not reached"); }, async reviewProposal() { throw new Error("not reached"); }, async listProposals() { return []; } } });
  const forbiddenApp = new Hono().basePath("/api");
  forbiddenApp.route("/admin/taxonomy", forbiddenRoutes);
  const forbidden = await forbiddenApp.request("http://localhost/api/admin/taxonomy/brands", { method: "POST", headers, body: JSON.stringify({ name: "Acme", slug: "acme" }) });
  assert.equal(forbidden.status, 403);
});

test("admin taxonomy routes use only documented errors for malformed JSON and unexpected typed failures", async () => {
  const routes = createAdminTaxonomyRoutes({
    sessions: { async resolve() { return admin; } },
    taxonomy: {
      async listCanonical() { throw new Error("postgres://admin:super-secret@db.internal/taxonomy"); },
      async listProposals() { throw new Error("database password=super-secret"); },
      async createCanonical() { throw new TaxonomyValidationError("database password=super-secret"); },
      async updateCanonical() { throw new Error("database password=super-secret"); },
      async reviewProposal() { throw new Error("database password=super-secret"); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/admin/taxonomy", routes);
  const authenticated = { Cookie: "nexamart_session=opaque-token" };

  const [canonical, proposals, create, update, review] = await Promise.all([
    app.request("http://localhost/api/admin/taxonomy", { headers: authenticated }),
    app.request("http://localhost/api/admin/taxonomy/proposals", { headers: authenticated }),
    app.request("http://localhost/api/admin/taxonomy/categories", { method: "POST", headers, body: JSON.stringify({ name: "Audio", slug: "audio" }) }),
    app.request("http://localhost/api/admin/taxonomy/categories/category-1", { method: "PATCH", headers, body: JSON.stringify({ name: "Audio" }) }),
    app.request("http://localhost/api/admin/taxonomy/proposals/proposal-1/review", { method: "POST", headers, body: JSON.stringify({ decision: "approve" }) }),
  ]);

  assert.equal(canonical.status, 500);
  assert.deepEqual(await canonical.json(), { error: "Unable to list taxonomy" });
  assert.equal(proposals.status, 500);
  assert.deepEqual(await proposals.json(), { error: "Unable to list proposals" });
  assert.equal(create.status, 500);
  assert.deepEqual(await create.json(), { error: "Unable to create taxonomy node" });
  assert.equal(update.status, 500);
  assert.deepEqual(await update.json(), { error: "Unable to update taxonomy node" });
  assert.equal(review.status, 500);
  assert.deepEqual(await review.json(), { error: "Unable to review proposal" });

  for (const request of [
    app.request("http://localhost/api/admin/taxonomy/categories", { method: "POST", headers, body: "{" }),
    app.request("http://localhost/api/admin/taxonomy/categories/category-1", { method: "PATCH", headers, body: "{" }),
    app.request("http://localhost/api/admin/taxonomy/proposals/proposal-1/review", { method: "POST", headers, body: "{" }),
  ]) {
    const response = await request;
    assert.equal(response.status, 400);
  }
});

test("seller taxonomy routes only forward a canonical classification and proposal owned by the session", async () => {
  const calls: unknown[] = [];
  const routes = createSellerTaxonomyRoutes({
    sessions: { async resolve() { return seller; } },
    taxonomy: {
      async activeOptions() { return { categories: [], subcategories: [], brands: [] }; },
      async classifyProduct(input: unknown) { calls.push(input); return { productId: "product-1" }; },
      async submitProposal(input: unknown) { calls.push(input); return { id: "proposal-1", ...input as object }; },
      async listSellerProposals() { return []; },
      async withdrawProposal() { return true; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/taxonomy", routes);
  const classification = await app.request("http://localhost/api/seller/taxonomy/products/product-1/classification", { method: "PATCH", headers, body: JSON.stringify({ categoryId: "11111111-1111-4111-8111-111111111111", subcategoryId: "22222222-2222-4222-8222-222222222222", brandId: "33333333-3333-4333-8333-333333333333", sellerId: "attacker" }) });
  const proposal = await app.request("http://localhost/api/seller/taxonomy/proposals", { method: "POST", headers, body: JSON.stringify({ kind: "brand", name: " Acme ", slug: "acme", sellerId: "attacker" }) });

  assert.equal(classification.status, 200);
  assert.equal(proposal.status, 201);
  assert.deepEqual(calls, [
    { sellerId: seller.id, productId: "product-1", categoryId: "11111111-1111-4111-8111-111111111111", subcategoryId: "22222222-2222-4222-8222-222222222222", brandId: "33333333-3333-4333-8333-333333333333" },
    { sellerId: seller.id, kind: "brand", name: "Acme", slug: "acme" },
  ]);
});

test("taxonomy service rejects inactive or mismatched canonical classifications before changing a product", async () => {
  let classified = false;
  const service = new TaxonomyService({
    async activeOptions() { return { categories: [{ id: "category-1", name: "Audio", slug: "audio" }], subcategories: [{ id: "subcategory-1", categoryId: "category-2", name: "Headphones", slug: "headphones" }], brands: [{ id: "brand-1", name: "Acme", slug: "acme" }] }; },
    async classifyProduct() { classified = true; return true; },
  } as never, { async record() {} } as never);

  await assert.rejects(() => service.classifyProduct({ sellerId: seller.id, productId: "product-1", categoryId: "category-1", subcategoryId: "subcategory-1", brandId: "brand-1" }), /Subcategory does not belong to category/);
  assert.equal(classified, false);
});

test("proposal approval uses a transaction and appends an audit record", async () => {
  const transaction = {};
  let audit: unknown;
  const repository = {
    async findProposal() { return { id: "proposal-1", sellerId: seller.id, kind: "brand" as const, name: "Acme", slug: "acme", categoryId: null, status: "pending" as const }; },
    async findCanonicalBySlug() { return null; },
    async createCanonical(input: unknown) { return { id: "brand-1", ...input as object }; },
    async reviewProposal() { return true; },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new TaxonomyService(repository as never, { async record(input: unknown, database: unknown) { audit = { input, database }; } } as never);
  const result = await service.reviewProposal({ proposalId: "proposal-1", decision: "approve", adminId: admin.id });

  assert.equal(result.status, "approved");
  assert.deepEqual(audit, { input: { actorId: admin.id, action: "taxonomy.proposal.approved", resourceType: "taxonomy_proposal", resourceId: "proposal-1", metadata: { canonicalId: "brand-1", kind: "brand" } }, database: transaction });
});

test("proposal approval rejects a canonical node of another kind without review or audit", async () => {
  let reviewed = false;
  let audited = false;
  const repository = {
    async findProposal() { return { id: "proposal-1", sellerId: seller.id, kind: "brand" as const, name: "Acme", slug: "acme", categoryId: null, status: "pending" as const }; },
    async listCanonical() { return { categories: [{ id: "category-1", name: "Audio", slug: "audio", isActive: true }], subcategories: [], brands: [] }; },
    async reviewProposal() { reviewed = true; return true; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);

  await assert.rejects(() => service.reviewProposal({ proposalId: "proposal-1", decision: "approve", canonicalId: "category-1", adminId: admin.id }), /Canonical taxonomy node does not match proposal/);
  assert.equal(reviewed, false);
  assert.equal(audited, false);
});

test("seller taxonomy proposal rejects active canonical and pending duplicates with documented statuses", async () => {
  const activeDuplicate = createSellerTaxonomyRoutes({ sessions: { async resolve() { return seller; } }, taxonomy: {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; }, async classifyProduct() {}, async submitProposal() { throw new TaxonomyConflictError("Taxonomy slug already exists"); }, async listSellerProposals() { return []; }, async withdrawProposal() {},
  } });
  const pendingDuplicate = createSellerTaxonomyRoutes({ sessions: { async resolve() { return seller; } }, taxonomy: {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; }, async classifyProduct() {}, async submitProposal() { throw new TaxonomyConflictError("Taxonomy proposal already pending"); }, async listSellerProposals() { return []; }, async withdrawProposal() {},
  } });
  const activeApp = new Hono().basePath("/api"); activeApp.route("/seller/taxonomy", activeDuplicate);
  const pendingApp = new Hono().basePath("/api"); pendingApp.route("/seller/taxonomy", pendingDuplicate);
  const request = { method: "POST", headers, body: JSON.stringify({ kind: "brand", name: "Acme", slug: "acme" }) };

  const active = await activeApp.request("http://localhost/api/seller/taxonomy/proposals", request);
  const pending = await pendingApp.request("http://localhost/api/seller/taxonomy/proposals", request);
  assert.equal(active.status, 409);
  assert.deepEqual(await active.json(), { error: "Taxonomy slug already exists" });
  assert.equal(pending.status, 409);
  assert.deepEqual(await pending.json(), { error: "Taxonomy proposal already pending" });
});

test("seller taxonomy exposes only explicitly documented typed errors", async () => {
  const routes = createSellerTaxonomyRoutes({ sessions: { async resolve() { return seller; } }, taxonomy: {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; },
    async classifyProduct() { throw new TaxonomyValidationError("database password=super-secret"); },
    async submitProposal() { throw new TaxonomyConflictError("postgres://admin:super-secret@db.internal/taxonomy"); },
    async listSellerProposals() { return []; },
    async withdrawProposal() { throw new TaxonomyNotFoundError("database password=super-secret"); },
  } });
  const app = new Hono().basePath("/api");
  app.route("/seller/taxonomy", routes);

  const [classification, proposal, withdrawal] = await Promise.all([
    app.request("http://localhost/api/seller/taxonomy/products/product-1/classification", { method: "PATCH", headers, body: JSON.stringify({ categoryId: "11111111-1111-4111-8111-111111111111" }) }),
    app.request("http://localhost/api/seller/taxonomy/proposals", { method: "POST", headers, body: JSON.stringify({ kind: "brand", name: "Acme", slug: "acme" }) }),
    app.request("http://localhost/api/seller/taxonomy/proposals/11111111-1111-4111-8111-111111111111", { method: "DELETE", headers }),
  ]);

  assert.equal(classification.status, 500);
  assert.deepEqual(await classification.json(), { error: "Unable to classify product" });
  assert.equal(proposal.status, 500);
  assert.deepEqual(await proposal.json(), { error: "Unable to submit proposal" });
  assert.equal(withdrawal.status, 500);
  assert.deepEqual(await withdrawal.json(), { error: "Unable to withdraw proposal" });
});

test("seller taxonomy retains documented validation and missing-resource contracts", async () => {
  const validationRoutes = createSellerTaxonomyRoutes({ sessions: { async resolve() { return seller; } }, taxonomy: {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; },
    async classifyProduct() { throw new TaxonomyValidationError("Subcategory does not belong to category"); },
    async submitProposal() { return {}; }, async listSellerProposals() { return []; }, async withdrawProposal() { return true; },
  } });
  const missingRoutes = createSellerTaxonomyRoutes({ sessions: { async resolve() { return seller; } }, taxonomy: {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; }, async classifyProduct() { return {}; },
    async submitProposal() { return {}; }, async listSellerProposals() { return []; }, async withdrawProposal() { throw new TaxonomyNotFoundError("Proposal not found"); },
  } });
  const validationApp = new Hono().basePath("/api"); validationApp.route("/seller/taxonomy", validationRoutes);
  const missingApp = new Hono().basePath("/api"); missingApp.route("/seller/taxonomy", missingRoutes);

  const validation = await validationApp.request("http://localhost/api/seller/taxonomy/products/product-1/classification", { method: "PATCH", headers, body: JSON.stringify({ categoryId: "11111111-1111-4111-8111-111111111111" }) });
  const missing = await missingApp.request("http://localhost/api/seller/taxonomy/proposals/11111111-1111-4111-8111-111111111111", { method: "DELETE", headers });

  assert.equal(validation.status, 400);
  assert.deepEqual(await validation.json(), { error: "Subcategory does not belong to category" });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Proposal not found" });
});

test("seller product classification returns the updated safe seller product", async () => {
  const product = { id: "product-1", sellerId: seller.id, name: "Headphones", stock: 8, isPublished: false, categoryId: "category-1", subcategoryId: "subcategory-1", brandId: "brand-1" };
  const repository = {
    async activeOptions() { return { categories: [{ id: "category-1", name: "Audio", slug: "audio" }], subcategories: [{ id: "subcategory-1", categoryId: "category-1", name: "Headphones", slug: "headphones" }], brands: [{ id: "brand-1", name: "Acme", slug: "acme" }] }; },
    async classifyProduct() { return product; },
  };
  const service = new TaxonomyService(repository as never, { async record() {} } as never);

  assert.deepEqual(await service.classifyProduct({ sellerId: seller.id, productId: product.id, categoryId: "category-1", subcategoryId: "subcategory-1", brandId: "brand-1" }), product);
});

test("canonical taxonomy updates return 404 when the node does not exist", async () => {
  const repository = {
    async updateCanonical() { return null; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const taxonomy = new TaxonomyService(repository as never, { async record() {} } as never);
  const routes = createAdminTaxonomyRoutes({ sessions: { async resolve() { return admin; } }, taxonomy });
  const app = new Hono().basePath("/api");
  app.route("/admin/taxonomy", routes);

  const response = await app.request("http://localhost/api/admin/taxonomy/categories/category-404", { method: "PATCH", headers, body: JSON.stringify({ name: "Audio" }) });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Taxonomy node not found" });
});

test("concurrent target-parent archival maps a guarded subcategory reparent to 400 without an audit", async () => {
  let activeChecks = 0;
  let audited = false;
  const repository = {
    async activeOptions() { return { categories: ++activeChecks === 1 ? [{ id: "44444444-4444-4444-8444-444444444444", name: "Gaming", slug: "gaming" }] : [], subcategories: [], brands: [] }; },
    async updateCanonical() { return null; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const taxonomy = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);
  const routes = createAdminTaxonomyRoutes({ sessions: { async resolve() { return admin; } }, taxonomy });
  const app = new Hono().basePath("/api");
  app.route("/admin/taxonomy", routes);

  const response = await app.request("http://localhost/api/admin/taxonomy/subcategories/subcategory-1", { method: "PATCH", headers, body: JSON.stringify({ categoryId: "44444444-4444-4444-8444-444444444444" }) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Category is not active" });
  assert.equal(audited, false);
});

test("concurrent source-parent archival maps a guarded subcategory update to 400 without an audit", async () => {
  let audited = false;
  const repository = {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; },
    async listCanonical() { return { categories: [{ id: "category-source", name: "Audio", slug: "audio", isActive: false }], subcategories: [{ id: "subcategory-1", categoryId: "category-source", name: "Headphones", slug: "headphones", isActive: true }], brands: [] }; },
    async updateCanonical() { return null; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const taxonomy = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);
  const routes = createAdminTaxonomyRoutes({ sessions: { async resolve() { return admin; } }, taxonomy });
  const app = new Hono().basePath("/api");
  app.route("/admin/taxonomy", routes);

  const response = await app.request("http://localhost/api/admin/taxonomy/subcategories/subcategory-1", { method: "PATCH", headers, body: JSON.stringify({ name: "Headsets" }) });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Category is not active" });
  assert.equal(audited, false);
});

test("subcategory reparenting resolves and locks source and target parents in deterministic order", async () => {
  const repository = await readFile(new URL("../src/modules/taxonomy/postgres-taxonomy.repository.ts", import.meta.url), "utf8");

  assert.match(repository, /const sourceParent = \(await this\.database\.select\(\{ categoryId: subcategories\.categoryId \}\)\.from\(subcategories\)\.where\(eq\(subcategories\.id, input\.id\)\)\.limit\(1\)\)\[0\]\?\.categoryId;/);
  assert.match(repository, /await this\.lockCategories\(\[sourceParent, input\.categoryId\]\);/);
  assert.match(repository, /private async lockCategories\(categoryIds: \(string \| undefined\)\[\]\) \{ for \(const categoryId of \[\.\.\.new Set\(categoryIds\.filter\(\(categoryId\): categoryId is string => Boolean\(categoryId\)\)\)\]\.sort\(\)\) await this\.lockCategory\(categoryId\); \}/);
});

test("canonical subcategory reactivation rejects an archived persisted parent before mutation or audit", async () => {
  let updated = false;
  let audited = false;
  const repository = {
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; },
    async listCanonical() { return { categories: [{ id: "category-1", name: "Audio", slug: "audio", isActive: false }], subcategories: [{ id: "subcategory-1", categoryId: "category-1", name: "Headphones", slug: "headphones", isActive: false }], brands: [] }; },
    async updateCanonical() { updated = true; return { id: "subcategory-1", categoryId: "category-1", name: "Headphones", slug: "headphones", isActive: true }; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);

  await assert.rejects(() => service.updateCanonical({ kind: "subcategory", id: "subcategory-1", isActive: true, adminId: admin.id }), /Category is not active/);
  assert.equal(updated, false);
  assert.equal(audited, false);
});

test("proposal approval rejects an archived subcategory parent before creating, reviewing, or auditing", async () => {
  let created = false;
  let reviewed = false;
  let audited = false;
  const repository = {
    async findProposal() { return { id: "proposal-1", sellerId: seller.id, kind: "subcategory" as const, name: "Headphones", slug: "headphones", categoryId: "category-1", status: "pending" as const }; },
    async activeOptions() { return { categories: [], subcategories: [], brands: [] }; },
    async findCanonicalBySlug() { return null; },
    async createCanonical() { created = true; return { id: "subcategory-1", categoryId: "category-1", name: "Headphones", slug: "headphones", isActive: true }; },
    async reviewProposal() { reviewed = true; return true; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);

  await assert.rejects(() => service.reviewProposal({ proposalId: "proposal-1", decision: "approve", adminId: admin.id }), /Category is not active/);
  assert.equal(created, false);
  assert.equal(reviewed, false);
  assert.equal(audited, false);
});

test("proposal approval rechecks an archived parent at its review write boundary without an audit", async () => {
  let activeChecks = 0;
  let reviewInput: unknown;
  let audited = false;
  const repository = {
    async findProposal() { return { id: "proposal-1", sellerId: seller.id, kind: "subcategory" as const, name: "Headphones", slug: "headphones", categoryId: "category-1", status: "pending" as const }; },
    async activeOptions() { return { categories: ++activeChecks === 1 ? [{ id: "category-1", name: "Audio", slug: "audio" }] : [], subcategories: [], brands: [] }; },
    async findCanonicalBySlug() { return { id: "subcategory-1" }; },
    async reviewProposal(input: unknown) { reviewInput = input; return false; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);

  await assert.rejects(() => service.reviewProposal({ proposalId: "proposal-1", decision: "approve", adminId: admin.id }), /Category is not active/);
  assert.deepEqual(reviewInput, { proposalId: "proposal-1", status: "approved", canonicalId: "subcategory-1", reviewNote: undefined, reviewedById: admin.id, activeCategoryId: "category-1" });
  assert.equal(audited, false);
});

test("proposal submission checks canonical and pending duplicates before creating or auditing", async () => {
  let created = false;
  let audited = false;
  const repository = {
    async findCanonicalBySlug() { return { id: "brand-1" }; },
    async findPendingProposal() { return null; },
    async createProposal() { created = true; throw new Error("not reached"); },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new TaxonomyService(repository as never, { async record() { audited = true; } } as never);
  await assert.rejects(() => service.submitProposal({ sellerId: seller.id, kind: "brand", name: "Acme", slug: "acme" }), /Taxonomy slug already exists/);
  assert.equal(created, false);
  assert.equal(audited, false);
});
