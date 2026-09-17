import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminReviewRoutes } from "../src/modules/admin/admin-review.routes.js";
import { AdminReviewService } from "../src/modules/admin/services/admin-review-service.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...admin, id: "customer-1", role: "customer" as const };
const review = { id: "review-1", productId: "product-1", customerId: "customer-1", rating: 5, title: "Excellent", body: "Built to last.", isVisible: true, createdAt: "2026-09-11T00:00:00.000Z" };

function makeApp(account = admin, reviews = {
  async list() { return [review]; },
  async setVisibility() { return review; },
}) {
  const routes = createAdminReviewRoutes({ sessions: { async resolve() { return account; } }, reviews });
  const app = new Hono().basePath("/api");
  app.route("/admin/reviews", routes);
  return app;
}

test("admin review list exposes moderation records only to an authenticated admin", async () => {
  const response = await makeApp().request("http://localhost/api/admin/reviews", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reviews: [review] });
});

test("admin review list hides unexpected persistence errors", async () => {
  const app = makeApp(admin, {
    async list() { throw new Error("postgres://admin:super-secret@db.internal connection refused"); },
    async setVisibility() { return review; },
  });
  const response = await app.request("http://localhost/api/admin/reviews", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to list reviews" });
});

test("admin review visibility moderation derives the actor from the admin session", async () => {
  let received: unknown;
  const app = makeApp(admin, {
    async list() { return []; },
    async setVisibility(input) { received = input; return { ...review, id: input.reviewId, isVisible: input.isVisible }; },
  });

  const response = await app.request("http://localhost/api/admin/reviews/review-1/visibility", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ isVisible: false, adminId: "attacker", actor: "attacker", role: "customer" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { reviewId: "review-1", isVisible: false, adminId: admin.id });
  assert.deepEqual(await response.json(), { review: { ...review, isVisible: false } });
});

test("admin review moderation rejects non-admin accounts", async () => {
  const response = await makeApp(customer).request("http://localhost/api/admin/reviews", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("admin review visibility keeps malformed JSON on its established validation contract", async () => {
  let changes = 0;
  const app = makeApp(admin, {
    async list() { return []; },
    async setVisibility() { changes += 1; throw new Error("not reached"); },
  });

  const response = await app.request("http://localhost/api/admin/reviews/review-1/visibility", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: "{",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid review visibility" });
  assert.equal(changes, 0);
});

test("admin review visibility hides unexpected persistence errors", async () => {
  const app = makeApp(admin, {
    async list() { return []; },
    async setVisibility() { throw new Error("database password=super-secret connection refused"); },
  });

  const response = await app.request("http://localhost/api/admin/reviews/review-1/visibility", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=admin-token" },
    body: JSON.stringify({ isVisible: false }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to update review" });
});

test("admin review visibility changes append a session-derived audit record after persistence", async () => {
  let auditInput: unknown;
  const repository = {
    async list() { return []; },
    async setVisibility(input: { reviewId: string; isVisible: boolean }) { return { ...review, id: input.reviewId, isVisible: input.isVisible }; },
    async withTransaction(work: any) { return work(repository, {}); },
  };
  const service = new AdminReviewService(repository, {
    async record(input) { auditInput = input; },
  });

  await service.setVisibility({ reviewId: review.id, isVisible: false, adminId: admin.id });

  assert.deepEqual(auditInput, {
    actorId: admin.id,
    action: "review.visibility_changed",
    resourceType: "product_review",
    resourceId: review.id,
    metadata: { isVisible: false },
  });
});

test("admin review visibility rolls back when its audit append fails", async () => {
  let persisted = false;
  const transaction = {};
  let auditDatabase: unknown;
  const repository = {
    async list() { return []; },
    async setVisibility(input: any) { persisted = true; return { ...review, id: input.reviewId, isVisible: input.isVisible }; },
    async withTransaction(work: any) {
      try { return await work(repository, transaction); } catch (error) { persisted = false; throw error; }
    },
  };
  const service = new AdminReviewService(repository, { async record(_input, database) { auditDatabase = database; throw new Error("audit unavailable"); } });

  await assert.rejects(() => service.setVisibility({ reviewId: review.id, isVisible: false, adminId: admin.id }), /audit unavailable/);
  assert.equal(auditDatabase, transaction);
  assert.equal(persisted, false);
});

test("admin review visibility rejects missing audit or transaction support before changing visibility", async () => {
  let visibilityChanges = 0;
  const repositoryWithoutTransaction = {
    async list() { return []; },
    async setVisibility() { visibilityChanges += 1; return review; },
  };
  const repositoryWithTransaction = {
    ...repositoryWithoutTransaction,
    async withTransaction(work: any) { return work(repositoryWithTransaction, {}); },
  };

  await assert.rejects(
    () => new AdminReviewService(repositoryWithoutTransaction as any, { async record() {} }).setVisibility({ reviewId: review.id, isVisible: false, adminId: admin.id }),
    /Transaction support is required/,
  );
  await assert.rejects(
    () => new AdminReviewService(repositoryWithTransaction as any).setVisibility({ reviewId: review.id, isVisible: false, adminId: admin.id }),
    /Audit support is required/,
  );
  assert.equal(visibilityChanges, 0);
});
