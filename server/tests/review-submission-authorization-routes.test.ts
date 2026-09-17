import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createReviewRoutes } from "../src/modules/reviews/review.routes.js";

const customer = { id: "customer-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", role: "seller" as const };
const admin = { ...customer, id: "admin-1", role: "admin" as const };
const payload = { customerId: "attacker-controlled-id", productId: "11111111-1111-4111-8111-111111111111", orderItemId: "22222222-2222-4222-8222-222222222222", rating: 5, title: "Excellent", body: "Built to last." };

function makeApp(account: typeof customer | typeof seller | typeof admin | null, create = async () => ({ id: "review-1" })) {
  const routes = createReviewRoutes({ sessions: { async resolve() { return account; } }, reviews: { create, async list() { return []; }, async listEligibleForCustomer() { return []; } } });
  const app = new Hono().basePath("/api");
  app.route("/reviews", routes);
  return app;
}

const submit = (app: Hono, cookie?: string) => app.request("http://localhost/api/reviews", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: `nexamart_session=${cookie}` } : {}) },
  body: JSON.stringify(payload),
});

test("review submission requires a customer session before invoking create", async () => {
  let createCalls = 0;
  const create = async () => { createCalls += 1; return { id: "review-1" }; };

  const unauthenticated = await submit(makeApp(null, create));
  const sellerResponse = await submit(makeApp(seller, create), "seller-token");
  const adminResponse = await submit(makeApp(admin, create), "admin-token");

  assert.equal(unauthenticated.status, 401);
  assert.equal(sellerResponse.status, 403);
  assert.equal(adminResponse.status, 403);
  assert.equal(createCalls, 0);
});

test("review submission derives the purchase-linked customer identity from the opaque session", async () => {
  let received: unknown;
  const response = await submit(makeApp(customer, async (input) => { received = input; return { id: "review-1" }; }), "customer-token");

  assert.equal(response.status, 201);
  assert.deepEqual(received, { customerId: customer.id, productId: payload.productId, orderItemId: payload.orderItemId, rating: payload.rating, title: payload.title, body: payload.body });
  assert.deepEqual(await response.json(), { review: { id: "review-1" } });
});

test("review submission maps a PostgreSQL duplicate-review violation to a safe conflict", async () => {
  const duplicate = Object.assign(new Error('duplicate key value violates unique constraint "product_reviews_order_item_id_key"'), { code: "23505" });

  const response = await submit(makeApp(customer, async () => { throw duplicate; }), "customer-token");

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "A review has already been submitted for this purchase" });
});

test("review submission preserves the delivered-purchase eligibility conflict contract", async () => {
  const response = await submit(makeApp(customer, async () => { throw new Error("Only delivered purchases can be reviewed"); }), "customer-token");

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Only delivered purchases can be reviewed" });
});

test("review submission hides unexpected persistence failures behind a generic server error", async () => {
  const response = await submit(makeApp(customer, async () => { throw new Error('relation "product_reviews" does not exist'); }), "customer-token");

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to save review" });
});

test("malformed review submissions do not invoke create", async () => {
  let createCalls = 0;
  const response = await makeApp(customer, async () => { createCalls += 1; return { id: "review-1" }; }).request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" },
    body: JSON.stringify({ productId: "not-a-uuid" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid review" });
  assert.equal(createCalls, 0);
});
