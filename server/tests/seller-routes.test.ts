import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const product = { name: "Studio Lamp", slug: "studio-lamp", description: "Warm adjustable lamp", primaryImageUrl: "💡", price: 89, stock: 5, colors: ["#fff"] };

const admin = { ...seller, id: "admin-1", email: "admin@example.com", role: "admin" as const };

test("admin cannot create seller products without a seller management surface", async () => {
  let created = false;
  const routes = createSellerRoutes({
    sessions: { async resolve() { return admin; } },
    sellerCatalog: { async createProduct() { created = true; return { id: "product-1" }; }, async listProducts() { return []; }, async updateStock() {} },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/products", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify(product) });
  assert.equal(response.status, 403);
  assert.equal(created, false);
});

test("seller product creation binds product ownership to the session seller", async () => {
  let received: { sellerId: string } & typeof product | undefined;
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: { async createProduct(input: { sellerId: string } & typeof product) { received = input; return { id: "product-1", ...input }; } },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  const response = await app.request("http://localhost/api/seller/products", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ sellerId: "attacker", ...product }) });
  assert.equal(response.status, 201);
  assert.equal(received?.sellerId, seller.id);
});
