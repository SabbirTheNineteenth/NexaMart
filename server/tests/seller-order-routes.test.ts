import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("seller orders route scopes the feed to the authenticated seller", async () => {
  let requestedSeller = "";
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: { async listProducts() { return []; }, async createProduct() { throw new Error("not used"); }, async updateStock() {} },
    orders: { async listForSeller(sellerId: string) { requestedSeller = sellerId; return [{ id: "order-1", reference: "NX-ORDER-1", status: "pending", createdAt: "2026-09-11T00:00:00.000Z", items: [{ id: "item-1", productName: "Studio Lamp", quantity: 2, fulfillmentStatus: "pending" }] }]; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  const response = await app.request("http://localhost/api/seller/orders", { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 200);
  assert.equal(requestedSeller, seller.id);
  assert.deepEqual(await response.json(), { orders: [{ id: "order-1", reference: "NX-ORDER-1", status: "pending", createdAt: "2026-09-11T00:00:00.000Z", items: [{ id: "item-1", productName: "Studio Lamp", quantity: 2, fulfillmentStatus: "pending" }] }] });
});
