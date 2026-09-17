import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createReviewRoutes } from "../src/modules/reviews/review.routes.js";

const customer = { id: "customer-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", role: "seller" as const };
const eligible = [{
  product: { id: "product-1", name: "Aurora Headphones", image: "https://cdn.example/aurora.jpg" },
  orderItem: { id: "order-item-1" },
  order: { id: "order-1", reference: "NM-2026-0001" },
}];

function makeApp(account: typeof customer | typeof seller | null = customer, reviews = {
  async create() { return { id: "review-1" }; },
  async list() { return []; },
  async listEligibleForCustomer() { return eligible; },
}) {
  const routes = createReviewRoutes({ sessions: { async resolve() { return account; } }, reviews });
  const app = new Hono().basePath("/api");
  app.route("/reviews", routes);
  return app;
}

test("customer review eligibility derives the customer from the session and returns only review submission fields", async () => {
  let receivedCustomerId: string | undefined;
  const app = makeApp(customer, {
    async create() { return { id: "review-1" }; },
    async list() { return []; },
    async listEligibleForCustomer(customerId: string) { receivedCustomerId = customerId; return eligible; },
  });

  const response = await app.request("http://localhost/api/reviews/eligible", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 200);
  assert.equal(receivedCustomerId, customer.id);
  const payload = await response.json() as { items: Array<Record<string, unknown>> };
  assert.deepEqual(payload, { items: eligible });
  assert.deepEqual(Object.keys(payload.items[0]).sort(), ["order", "orderItem", "product"]);
  assert.equal("shippingAddress" in payload.items[0], false);
  assert.equal("customerId" in payload.items[0], false);
});

test("customer review eligibility rejects missing and non-customer sessions", async () => {
  const unauthenticated = await makeApp(null).request("http://localhost/api/reviews/eligible");
  const nonCustomer = await makeApp(seller).request("http://localhost/api/reviews/eligible", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(unauthenticated.status, 401);
  assert.equal(nonCustomer.status, 403);
});

test("customer review eligibility returns a safe JSON error when the eligible review read fails", async () => {
  const app = makeApp(customer, {
    async create() { return { id: "review-1" }; },
    async list() { return []; },
    async listEligibleForCustomer() { throw new Error("database password=review-eligibility-secret"); },
  });

  const response = await app.request("http://localhost/api/reviews/eligible", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Unable to list eligible reviews" });
});
