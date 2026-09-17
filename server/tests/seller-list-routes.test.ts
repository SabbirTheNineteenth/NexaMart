import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("seller list route returns only products for the authenticated seller", async () => {
  let requestedSeller = "";
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: {
      async listProducts(sellerId: string) { requestedSeller = sellerId; return [{ id: "product-1", sellerId, name: "Studio Lamp", stock: 5, isPublished: false }]; },
      async createProduct() { throw new Error("not used"); }, async updateStock() {},
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  const response = await app.request("http://localhost/api/seller/products", { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 200);
  assert.equal(requestedSeller, seller.id);
  assert.deepEqual(await response.json(), { products: [{ id: "product-1", sellerId: seller.id, name: "Studio Lamp", stock: 5, isPublished: false }] });
});
