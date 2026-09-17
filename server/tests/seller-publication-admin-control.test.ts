import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("an authenticated seller cannot publish a product or invoke a publication operation", async () => {
  let publicationInvoked = false;
  const sellerCatalog = {
    async listProducts() { return []; },
    async createProduct() { return { id: "product-1" }; },
    async updateProduct() { return { id: "product-1" }; },
    async updateStock() {},
    async publishProduct() { publicationInvoked = true; },
  };
  const app = new Hono().basePath("/api");
  app.route("/seller", createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: sellerCatalog as never,
    orders: { async listForSeller() { return []; } },
  }));

  const response = await app.request("http://localhost/api/seller/products/product-1/publish", {
    method: "PATCH",
    headers: { Cookie: "nexamart_session=valid-token" },
  });

  assert.equal(response.status, 404);
  assert.equal(publicationInvoked, false);
});
