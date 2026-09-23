import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_CATALOG_SEED_PLAN } from "../src/db/seeds/demo-catalog-plan.js";
import { isDuplicateGalleryImage, normalizeProductImageUrl, productImageIdentity } from "../src/modules/catalog/product-image-duplicates.js";
import { DuplicateGalleryImageError, DuplicatePrimaryProductImageError, SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

test("normalizes valid product image URLs without erasing meaningful query values", () => {
  assert.equal(normalizeProductImageUrl(" HTTPS://Images.Example.test/item.jpg?fit=crop#preview "), "https://images.example.test/item.jpg?fit=crop");
  assert.equal(normalizeProductImageUrl("http://images.example.test/item.jpg?width=100"), "http://images.example.test/item.jpg?width=100");
  assert.equal(normalizeProductImageUrl("not a URL"), undefined);
  assert.equal(normalizeProductImageUrl("ftp://images.example.test/item.jpg"), undefined);
});

test("uses the known Unsplash source path as stable media identity while retaining arbitrary-source URL identity", () => {
  const transformedA = "https://images.unsplash.com/photo-12345-abcdef?fit=crop&w=640&q=75";
  const transformedB = "https://IMAGES.unsplash.com/photo-12345-abcdef?crop=entropy&w=1440&q=95#hero";
  assert.equal(productImageIdentity(transformedA), productImageIdentity(transformedB));
  assert.notEqual(productImageIdentity(transformedA), productImageIdentity("https://images.unsplash.com/photo-98765-fedcba?w=640"));
  assert.notEqual(productImageIdentity("https://cdn.example.test/image.jpg?width=640"), productImageIdentity("https://cdn.example.test/image.jpg?width=1440"));
});

test("local demo plan has no duplicate normalized or stable-media primary images", () => {
  const images = DEMO_CATALOG_SEED_PLAN.map((product) => normalizeProductImageUrl(product.imageUrl));
  const identities = DEMO_CATALOG_SEED_PLAN.map((product) => productImageIdentity(product.imageUrl));
  assert.equal(images.every(Boolean), true);
  assert.equal(new Set(images).size, DEMO_CATALOG_SEED_PLAN.length);
  assert.equal(identities.every(Boolean), true);
  assert.equal(new Set(identities).size, DEMO_CATALOG_SEED_PLAN.length);
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

test("seller primary image validation rejects another published product media but permits retaining the owned image", async () => {
  let created = 0;
  let updated = 0;
  const catalog = new SellerCatalogService({
    async listPublishedPrimaryImageReferences() { return [{ id: "published-product", primaryImageUrl: "https://images.unsplash.com/photo-12345-abcdef?w=640" }]; },
    async ownedPrimaryImage() { return "https://images.unsplash.com/photo-54321-abcdef?w=640"; },
    async createProduct(input: Record<string, unknown>) { created += 1; return { id: "created", ...input }; },
    async updateProduct(input: Record<string, unknown>) { updated += 1; return { id: input.productId, ...input }; },
  } as never);
  const create = { sellerId: "seller-1", name: "Lamp", slug: "lamp", description: "A real seller product", primaryImageUrl: "https://images.unsplash.com/photo-12345-abcdef?w=1440&q=95", price: 89, stock: 2, colors: ["Black"] };
  await assert.rejects(() => catalog.createProduct(create), DuplicatePrimaryProductImageError);
  await catalog.updateProduct({ sellerId: "seller-1", productId: "owned-product", primaryImageUrl: "https://images.unsplash.com/photo-54321-abcdef?w=1280" });
  await assert.rejects(() => catalog.updateProduct({ sellerId: "seller-1", productId: "owned-product", primaryImageUrl: "https://images.unsplash.com/photo-12345-abcdef?fit=crop" }), DuplicatePrimaryProductImageError);
  assert.equal(created, 0);
  assert.equal(updated, 1);
});

test("seller primary-image conflicts preserve the authenticated seller route and return the exact field error", async () => {
  const routes = createSellerRoutes({
    sessions: { async resolve() { return { id: "seller-1", name: "Seller", email: "seller@example.test", role: "seller" as const, createdAt: "2026-01-01T00:00:00.000Z" }; } },
    sellerCatalog: { async createProduct() { throw new DuplicatePrimaryProductImageError(); } } as never,
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  const response = await app.request("http://localhost/api/seller/products", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque" }, body: JSON.stringify({ name: "Desk lamp", slug: "desk-lamp", description: "A focused desk lamp", primaryImageUrl: "https://images.unsplash.com/photo-12345-abcdef?w=640", price: 89, stock: 2, colors: ["Black"] }) });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "This product image is already used by another catalog product. Choose a different image." });
});
