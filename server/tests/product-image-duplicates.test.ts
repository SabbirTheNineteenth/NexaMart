import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CATALOG_SEED_PLAN } from "../src/db/seeds/demo-catalog-plan.js";
import { isDuplicateGalleryImage, normalizeProductImageUrl } from "../src/modules/catalog/product-image-duplicates.js";
import { DuplicateGalleryImageError, SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

test("normalizes valid product image URLs without erasing meaningful query values", () => {
  assert.equal(normalizeProductImageUrl(" HTTPS://Images.Example.test/item.jpg?fit=crop#preview "), "https://images.example.test/item.jpg?fit=crop");
  assert.equal(normalizeProductImageUrl("http://images.example.test/item.jpg?width=100"), "http://images.example.test/item.jpg?width=100");
  assert.equal(normalizeProductImageUrl("not a URL"), undefined);
  assert.equal(normalizeProductImageUrl("ftp://images.example.test/item.jpg"), undefined);
});

test("local demo plan has no duplicate normalized primary image URLs", () => {
  const images = DEMO_CATALOG_SEED_PLAN.map((product) => normalizeProductImageUrl(product.imageUrl));
  assert.equal(images.every(Boolean), true);
  assert.equal(new Set(images).size, DEMO_CATALOG_SEED_PLAN.length);
});

test("gallery duplicate detection stays scoped to one product and excludes the edited image", () => {
  const images = [
    { id: "image-1", imageUrl: "https://cdn.example.test/lamp.jpg#hero" },
    { id: "image-2", imageUrl: "https://cdn.example.test/lamp-side.jpg" },
  ];
  assert.equal(isDuplicateGalleryImage(images, " https://CDN.example.test/lamp.jpg "), true);
  assert.equal(isDuplicateGalleryImage(images, "https://cdn.example.test/lamp.jpg#new", "image-1"), false);
  assert.equal(isDuplicateGalleryImage(images, "https://cdn.example.test/another-product-lamp.jpg"), false);
});

test("seller service rejects duplicate gallery URLs on create and edit but permits another product", async () => {
  const images = [{ id: "image-1", imageUrl: "https://cdn.example.test/lamp.jpg", sortOrder: 0 }];
  let createCalls = 0;
  let updateCalls = 0;
  const catalog = new SellerCatalogService({
    async listGalleryImages() { return images; },
    async createGalleryImage() { createCalls += 1; return { id: "image-2", imageUrl: "https://cdn.example.test/new.jpg", sortOrder: 1 }; },
    async updateGalleryImage() { updateCalls += 1; return { id: "image-2", imageUrl: "https://cdn.example.test/new.jpg", sortOrder: 1 }; },
  } as never);
  const base = { sellerId: "seller-1", productId: "product-1", imageUrl: "https://CDN.example.test/lamp.jpg#detail", sortOrder: 1 };
  await assert.rejects(() => catalog.createGalleryImage(base), DuplicateGalleryImageError);
  await assert.rejects(() => catalog.updateGalleryImage({ ...base, imageId: "image-2" }), DuplicateGalleryImageError);
  await catalog.updateGalleryImage({ ...base, productId: "product-2", imageId: "image-1", imageUrl: "https://cdn.example.test/another-product.jpg" });
  assert.equal(createCalls, 0);
  assert.equal(updateCalls, 1);
});

test("seller gallery duplicate conflicts retain the existing seller-only route guard", async () => {
  const routes = createSellerRoutes({
    sessions: { async resolve() { return { id: "seller-1", name: "Seller", email: "seller@example.test", role: "seller" as const, createdAt: "2026-01-01T00:00:00.000Z" }; } },
    sellerCatalog: { async createGalleryImage() { throw new DuplicateGalleryImageError(); } } as never,
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  const response = await app.request("http://localhost/api/seller/products/product-1/gallery-images", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque" }, body: JSON.stringify({ imageUrl: "https://cdn.example.test/lamp.jpg", sortOrder: 0 }) });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "This image is already in this product gallery. Choose a different image." });
});
