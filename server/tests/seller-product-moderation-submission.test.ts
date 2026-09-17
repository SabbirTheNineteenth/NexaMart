import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { PostgresSellerCatalogRepository } from "../src/modules/seller/postgres-seller-catalog.repository.js";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };
const authHeaders = { Cookie: "nexamart_session=opaque-session-token" };

test("a seller submits only an owned draft or changes-requested product for review", async () => {
  let received: unknown;
  const sellerCatalog = {
    async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateProduct() { return { id: "unused" }; }, async updateStock() {},
    async submitForReview(input: unknown) { received = input; return { id: "product-1", moderationStatus: "pending_review", moderationReason: null, isPublished: false }; },
  };
  const app = new Hono().basePath("/api");
  app.route("/seller", createSellerRoutes({ sessions: { async resolve() { return seller; } }, sellerCatalog: sellerCatalog as never, orders: { async listForSeller() { return []; } } }));

  const response = await app.request("http://localhost/api/seller/products/product-1/submit-for-review", { method: "POST", headers: authHeaders });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { sellerId: seller.id, productId: "product-1" });
  assert.deepEqual(await response.json(), { product: { id: "product-1", moderationStatus: "pending_review", moderationReason: null, isPublished: false } });
});

test("submit-for-review remains seller-only", async () => {
  let called = false;
  const sellerCatalog = { async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateProduct() { return { id: "unused" }; }, async updateStock() {}, async submitForReview() { called = true; return {}; } };
  const app = new Hono().basePath("/api");
  app.route("/seller", createSellerRoutes({ sessions: { async resolve() { return customer; } }, sellerCatalog: sellerCatalog as never, orders: { async listForSeller() { return []; } } }));

  const response = await app.request("http://localhost/api/seller/products/product-1/submit-for-review", { method: "POST", headers: authHeaders });

  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("repository submits only an owned draft or changes-requested product and clears prior guidance", async () => {
  let persisted: Record<string, unknown> | undefined;
  const database = {
    update() {
      const query = {
        set(values: Record<string, unknown>) { persisted = values; return query; },
        where() { return query; },
        returning() { return Promise.resolve([{ id: "product-1", isPublished: false, moderationStatus: "pending_review", moderationReason: null }]); },
      };
      return query;
    },
  };
  const product = await new PostgresSellerCatalogRepository({ ...database, select() { const query = { from() { return query; }, where() { return query; }, limit() { return Promise.resolve([{ id: "product-1" }]); } }; return query; } } as never).submitForReview({ sellerId: "seller-1", productId: "product-1" });

  assert.deepEqual(product, { kind: "submitted", product: { id: "product-1", isPublished: false, moderationStatus: "pending_review", moderationReason: null } });
  assert.equal(persisted?.moderationStatus, "pending_review");
  assert.equal(persisted?.moderationReason, null);
  assert.equal(persisted?.isPublished, false);
});
