import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createReviewRoutes } from "../src/modules/reviews/review.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("review route binds a delivered-item review to the authenticated customer", async () => {
  let received: unknown;
  const routes = createReviewRoutes({ sessions: { async resolve() { return account; } }, reviews: { async create(input) { received = input; return { id: "review-1" }; }, async list() { return []; } } });
  const app = new Hono().basePath("/api"); app.route("/reviews", routes);
  const response = await app.request("http://localhost/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=token" }, body: JSON.stringify({ customerId: "attacker", productId: "11111111-1111-4111-8111-111111111111", orderItemId: "22222222-2222-4222-8222-222222222222", rating: 5, title: "Excellent", body: "Built to last." }) });
  assert.equal(response.status, 201);
  assert.deepEqual(received, { customerId: account.id, productId: "11111111-1111-4111-8111-111111111111", orderItemId: "22222222-2222-4222-8222-222222222222", rating: 5, title: "Excellent", body: "Built to last." });
});

test("public review reads reject malformed product IDs without listing reviews", async () => {
  let listCalls = 0;
  const routes = createReviewRoutes({ sessions: { async resolve() { return null; } }, reviews: { async create() { return { id: "review-1" }; }, async list() { listCalls += 1; return []; } } });
  const app = new Hono().basePath("/api"); app.route("/reviews", routes);

  const response = await app.request("http://localhost/api/reviews/product/not-a-uuid");

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid product" });
  assert.equal(listCalls, 0);
});

test("public review reads accept valid UUID product IDs without a session", async () => {
  const productId = "11111111-1111-4111-8111-111111111111";
  const reviews = [{ id: "review-1", rating: 5 }];
  let received: string | undefined;
  const routes = createReviewRoutes({ sessions: { async resolve() { return null; } }, reviews: { async create() { return { id: "review-1" }; }, async list(id) { received = id; return reviews; } } });
  const app = new Hono().basePath("/api"); app.route("/reviews", routes);

  const response = await app.request(`http://localhost/api/reviews/product/${productId}`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { reviews });
  assert.equal(received, productId);
});

test("public review reads return a generic JSON failure without persistence details", async () => {
  const productId = "11111111-1111-4111-8111-111111111111";
  const routes = createReviewRoutes({
    sessions: { async resolve() { return null; } },
    reviews: {
      async create() { return { id: "review-1" }; },
      async list() { throw new Error('database connection refused at 10.0.0.5 for user "postgres"'); },
    },
  });
  const app = new Hono().basePath("/api"); app.route("/reviews", routes);

  const response = await app.request(`http://localhost/api/reviews/product/${productId}`);

  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to list reviews" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});
