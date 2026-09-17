import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerReviewRoutes } from "../src/modules/seller/seller-review.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };
const review = {
  id: "review-1",
  product: { id: "product-1", name: "Studio Lamp" },
  rating: 5,
  title: "Excellent",
  body: "Built to last.",
  createdAt: "2026-09-11T00:00:00.000Z",
  isVisible: true,
};

function makeApp(account: typeof seller | typeof customer | null = seller, reviews = { async listForSeller() { return [review]; } }) {
  const routes = createSellerReviewRoutes({ sessions: { async resolve() { return account; } }, reviews });
  const app = new Hono().basePath("/api");
  app.route("/seller/reviews", routes);
  return app;
}

test("seller review list derives seller identity from the session and returns only the safe review workflow fields", async () => {
  let requestedSellerId = "";
  const app = makeApp(seller, {
    async listForSeller(sellerId: string) {
      requestedSellerId = sellerId;
      return [review];
    },
  });

  const response = await app.request("http://localhost/api/seller/reviews", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 200);
  assert.equal(requestedSellerId, seller.id);
  const payload = await response.json() as { reviews: Array<Record<string, unknown>> };
  assert.deepEqual(payload, { reviews: [review] });
  assert.deepEqual(Object.keys(payload.reviews[0]).sort(), ["body", "createdAt", "id", "isVisible", "product", "rating", "title"]);
  assert.equal("email" in payload.reviews[0], false);
  assert.equal("password" in payload.reviews[0], false);
  assert.equal("address" in payload.reviews[0], false);
});

test("seller review list returns 401 without a session", async () => {
  const response = await makeApp().request("http://localhost/api/seller/reviews");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("seller review list returns 403 for an authenticated non-seller", async () => {
  const response = await makeApp(customer).request("http://localhost/api/seller/reviews", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});

test("seller review list returns a safe operation-specific 500 when review lookup fails", async () => {
  const app = makeApp(seller, {
    async listForSeller() { throw new Error('database connection refused at 10.0.0.5'); },
  });

  const response = await app.request("http://localhost/api/seller/reviews", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to load seller reviews" });
  assert.equal(body.error.includes("10.0.0.5"), false);
});
