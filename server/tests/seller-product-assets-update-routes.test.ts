import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const authHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" };

function createApp() {
  const calls: { updateVariant?: unknown; updateGalleryImage?: unknown; deleteVariant?: unknown; deleteGalleryImage?: unknown; archiveProduct?: unknown } = {};
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: {
      async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateProduct() { return { id: "unused" }; },
      async updateStock() {}, async createVariant() { return { id: "unused" }; }, async listVariants() { return []; },
      async createGalleryImage() { return { id: "unused" }; }, async listGalleryImages() { return []; },
      async updateVariant(input: unknown) { calls.updateVariant = input; return { id: "variant-1", ...input as object }; },
      async updateGalleryImage(input: unknown) { calls.updateGalleryImage = input; return { id: "image-1", ...input as object }; },
      async deleteVariant(input: unknown) { calls.deleteVariant = input; },
      async deleteGalleryImage(input: unknown) { calls.deleteGalleryImage = input; },
      async archiveProduct(input: unknown) { calls.archiveProduct = input; },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  return { app, calls };
}

test("seller archives only a session-owned product without deleting its record", async () => {
  const { app, calls } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1", { method: "DELETE", headers: authHeaders });

  assert.equal(response.status, 204);
  assert.deepEqual(calls.archiveProduct, { sellerId: seller.id, productId: "product-1" });
});

test("seller deletes only session-owned product assets", async () => {
  const { app, calls } = createApp();
  const variantResponse = await app.request("http://localhost/api/seller/products/product-1/variants/variant-1", { method: "DELETE", headers: authHeaders });
  const imageResponse = await app.request("http://localhost/api/seller/products/product-1/gallery-images/image-1", { method: "DELETE", headers: authHeaders });

  assert.equal(variantResponse.status, 204);
  assert.equal(imageResponse.status, 204);
  assert.deepEqual(calls.deleteVariant, { sellerId: seller.id, productId: "product-1", variantId: "variant-1" });
  assert.deepEqual(calls.deleteGalleryImage, { sellerId: seller.id, productId: "product-1", imageId: "image-1" });
});

test("seller catalog deletes return 404 for absent or unowned records", async () => {
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: {
      async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateProduct() { return { id: "unused" }; }, async updateStock() {}, async createVariant() { return { id: "unused" }; }, async listVariants() { return []; }, async createGalleryImage() { return { id: "unused" }; }, async listGalleryImages() { return []; }, async updateVariant() { return { id: "unused" }; }, async updateGalleryImage() { return { id: "unused" }; },
      async archiveProduct() { throw new Error("Product not found"); }, async deleteVariant() { throw new Error("Variant not found"); }, async deleteGalleryImage() { throw new Error("Gallery image not found"); },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  for (const [path, message] of [["products/other", "Product not found"], ["products/other/variants/missing", "Variant not found"], ["products/other/gallery-images/missing", "Gallery image not found"]] as const) {
    const response = await app.request(`http://localhost/api/seller/${path}`, { method: "DELETE", headers: authHeaders });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: message });
  }
});

test("seller updates only allowed fields on an owned variant", async () => {
  const { app, calls } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1/variants/variant-1", {
    method: "PATCH", headers: authHeaders,
    body: JSON.stringify({ sku: "LAMP-BLK", options: { color: "Black" }, price: 99.5, stock: 8 }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls.updateVariant, { sellerId: seller.id, productId: "product-1", variantId: "variant-1", sku: "LAMP-BLK", options: { color: "Black" }, price: 99.5, stock: 8 });
});

test("seller variant update rejects uneditable fields and an empty payload", async () => {
  const { app, calls } = createApp();
  const forbidden = await app.request("http://localhost/api/seller/products/product-1/variants/variant-1", {
    method: "PATCH", headers: authHeaders, body: JSON.stringify({ sellerId: "attacker", productId: "other", isPublished: true }),
  });
  const empty = await app.request("http://localhost/api/seller/products/product-1/variants/variant-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify({}) });

  assert.equal(forbidden.status, 400);
  assert.equal(empty.status, 400);
  assert.equal(calls.updateVariant, undefined);
});

test("seller updates only allowed fields on an owned gallery image", async () => {
  const { app, calls } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1/gallery-images/image-1", {
    method: "PATCH", headers: authHeaders,
    body: JSON.stringify({ imageUrl: "https://cdn.example/black-lamp.jpg", altText: "Black studio lamp", sortOrder: 2 }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls.updateGalleryImage, { sellerId: seller.id, productId: "product-1", imageId: "image-1", imageUrl: "https://cdn.example/black-lamp.jpg", altText: "Black studio lamp", sortOrder: 2 });
});

test("seller gallery image update rejects uneditable fields and an empty payload", async () => {
  const { app, calls } = createApp();
  const forbidden = await app.request("http://localhost/api/seller/products/product-1/gallery-images/image-1", {
    method: "PATCH", headers: authHeaders, body: JSON.stringify({ productId: "other", createdAt: "2026-01-01" }),
  });
  const empty = await app.request("http://localhost/api/seller/products/product-1/gallery-images/image-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify({}) });

  assert.equal(forbidden.status, 400);
  assert.equal(empty.status, 400);
  assert.equal(calls.updateGalleryImage, undefined);
});

test("seller asset updates return 404 when the asset is outside the seller-owned product", async () => {
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: {
      async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateProduct() { return { id: "unused" }; },
      async updateStock() {}, async createVariant() { return { id: "unused" }; }, async listVariants() { return []; },
      async createGalleryImage() { return { id: "unused" }; }, async listGalleryImages() { return []; },
      async updateVariant() { throw new Error("Variant not found"); }, async updateGalleryImage() { throw new Error("Gallery image not found"); },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const variantResponse = await app.request("http://localhost/api/seller/products/other-seller-product/variants/variant-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify({ stock: 8 }) });
  const imageResponse = await app.request("http://localhost/api/seller/products/other-seller-product/gallery-images/image-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify({ sortOrder: 1 }) });

  assert.equal(variantResponse.status, 404);
  assert.deepEqual(await variantResponse.json(), { error: "Variant not found" });
  assert.equal(imageResponse.status, 404);
  assert.deepEqual(await imageResponse.json(), { error: "Gallery image not found" });
});

test("seller variant update returns a conflict when its SKU duplicates another variant on the product", async () => {
  const duplicateSkuError = Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" });
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: {
      async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateProduct() { return { id: "unused" }; },
      async updateStock() {}, async createVariant() { return { id: "unused" }; }, async listVariants() { return []; },
      async createGalleryImage() { return { id: "unused" }; }, async listGalleryImages() { return []; },
      async updateVariant() { throw duplicateSkuError; }, async updateGalleryImage() { return { id: "unused" }; },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/products/product-1/variants/variant-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify({ sku: "LAMP-BLK" }) });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Variant SKU already exists" });
});
