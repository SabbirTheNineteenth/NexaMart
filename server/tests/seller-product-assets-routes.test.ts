import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", email: "customer@example.com", role: "customer" as const };

const createApp = (account = seller) => {
  const calls: { createVariant?: unknown; createGalleryImage?: unknown } = {};
  const routes = createSellerRoutes({
    sessions: { async resolve() { return account; } },
    sellerCatalog: {
      async createProduct() { return { id: "product-1" }; },
      async listProducts() { return []; },
      async updateStock() {},

      async createVariant(input: unknown) { calls.createVariant = input; return { id: "variant-1", ...input as object }; },
      async listVariants() { return [{ id: "variant-1", sku: "LAMP-WHT" }]; },
      async createGalleryImage(input: unknown) { calls.createGalleryImage = input; return { id: "image-1", ...input as object }; },
      async listGalleryImages() { return [{ id: "image-1", imageUrl: "https://cdn.example/lamp.jpg", sortOrder: 0 }]; },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  return { app, calls };
};

const authHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" };

test("seller creates a SKU variant owned by the session seller's product", async () => {
  const { app, calls } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1/variants", {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ sellerId: "attacker", sku: "LAMP-WHT", options: { color: "White" }, price: 89, stock: 5 }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(calls.createVariant, { sellerId: seller.id, productId: "product-1", sku: "LAMP-WHT", options: { color: "White" }, price: 89, stock: 5 });
});

test("seller lists only variants for a product it owns", async () => {
  const { app } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1/variants", { headers: { Cookie: "nexamart_session=opaque-session-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { variants: [{ id: "variant-1", sku: "LAMP-WHT" }] });
});

test("seller creates a gallery image owned by the session seller's product", async () => {
  const { app, calls } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1/gallery-images", {
    method: "POST", headers: authHeaders,
    body: JSON.stringify({ sellerId: "attacker", imageUrl: "https://cdn.example/lamp.jpg", altText: "Studio lamp", sortOrder: 0 }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(calls.createGalleryImage, { sellerId: seller.id, productId: "product-1", imageUrl: "https://cdn.example/lamp.jpg", altText: "Studio lamp", sortOrder: 0 });
});

test("seller-only asset endpoints reject non-seller sessions", async () => {
  const { app } = createApp(customer);
  const response = await app.request("http://localhost/api/seller/products/product-1/gallery-images", { headers: { Cookie: "nexamart_session=opaque-session-token" } });

  assert.equal(response.status, 403);
});
