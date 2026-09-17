import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { toPublicProductDetail } from "../src/modules/catalog/catalog.types.js";
import { createCatalogRoutes } from "../src/modules/catalog/catalog.routes.js";
import { PostgresCatalogRepository } from "../src/modules/catalog/postgres-catalog.repository.js";

test("public product detail exposes only ordered gallery metadata and current variant purchase fields", () => {
  const detail = toPublicProductDetail({
    id: "product-1",
    slug: "studio-lamp",
    name: "Studio Lamp",
    category: "Home",
    price: 89,
    rating: 4.7,
    reviews: 91,
    image: "https://cdn.example/lamp-primary.jpg",
    description: "Warm adjustable lamp",
    colors: ["White"],
    inStock: true,
    sellerId: "seller-1",
    galleryImages: [
      { id: "image-2", productId: "product-1", imageUrl: "https://cdn.example/lamp-side.jpg", altText: "Side view", sortOrder: 2, createdAt: "2026-09-12" },
      { id: "image-1", productId: "product-1", imageUrl: "https://cdn.example/lamp-front.jpg", altText: null, sortOrder: 1, createdAt: "2026-09-12" },
    ],
    variants: [{ id: "variant-1", productId: "product-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 5, createdAt: "2026-09-12", updatedAt: "2026-09-12" }],
  });

  assert.deepEqual(detail.galleryImages, [
    { imageUrl: "https://cdn.example/lamp-front.jpg", sortOrder: 1 },
    { imageUrl: "https://cdn.example/lamp-side.jpg", altText: "Side view", sortOrder: 2 },
  ]);
  assert.deepEqual(detail.variants, [{ id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: 89, stock: 5 }]);
  assert.equal("sellerId" in detail, false);
  assert.equal("id" in detail.galleryImages[0]!, false);
  assert.equal("productId" in detail.variants[0]!, false);
  assert.equal(detail.variants[0]?.id, "variant-1");
});

test("public product detail route returns enriched published details and keeps missing products hidden", async () => {
  const product = toPublicProductDetail({
    id: "product-1", slug: "studio-lamp", name: "Studio Lamp", category: "Home", price: 89,
    rating: 4.7, reviews: 91, image: "https://cdn.example/lamp-primary.jpg",
    description: "Warm adjustable lamp", colors: ["White"], inStock: true,
    galleryImages: [{ imageUrl: "https://cdn.example/lamp-front.jpg", altText: null, sortOrder: 0 }],
    variants: [{ id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 5 }],
  });
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list() { return { products: [], categories: [] }; },
    async bySlug(slug: string) { return slug === product.slug ? product : null; },
  }));

  const detail = await app.request("http://localhost/api/catalog/products/studio-lamp");
  assert.equal(detail.status, 200);
  assert.deepEqual(await detail.json(), { product });

  const hidden = await app.request("http://localhost/api/catalog/products/unpublished-lamp");
  assert.equal(hidden.status, 404);
  assert.deepEqual(await hidden.json(), { error: "Product not found" });
});

test("public catalog listing returns a generic JSON failure without persistence details", async () => {
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list() { throw new Error('password authentication failed for user "postgres" at 10.0.0.5'); },
    async bySlug() { return null; },
  }));

  const response = await app.request("http://localhost/api/catalog/products");

  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to list products" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});

test("public catalog detail returns a generic JSON failure without persistence details", async () => {
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list() { return { products: [], categories: [] }; },
    async bySlug() { throw new Error('database connection refused at 10.0.0.5 for user "postgres"'); },
  }));

  const response = await app.request("http://localhost/api/catalog/products/studio-lamp");

  assert.equal(response.status, 500);
  const body = await response.json() as { error: string };
  assert.deepEqual(body, { error: "Unable to retrieve product" });
  assert.equal(body.error.includes("postgres"), false);
  assert.equal(body.error.includes("10.0.0.5"), false);
});

test("published product repository lookup reads ordered gallery images and variants without seller fields", async () => {
  const productRows = [{
    id: "product-1", slug: "studio-lamp", name: "Studio Lamp", brand: null, category: "Home", price: "89.00",
    originalPrice: null, rating: "4.70", reviewCount: 91, primaryImageUrl: "https://cdn.example/lamp-primary.jpg",
    description: "Warm adjustable lamp", colors: ["White"], stock: 5,
  }];
  const galleryRows = [
    { id: "image-2", productId: "product-1", imageUrl: "https://cdn.example/lamp-side.jpg", altText: "Side view", sortOrder: 2 },
    { id: "image-1", productId: "product-1", imageUrl: "https://cdn.example/lamp-front.jpg", altText: null, sortOrder: 1 },
  ];
  const variantRows = [{ id: "variant-1", productId: "product-1", sku: "LAMP-WHT", options: { color: "White" }, price: "89.00", stock: 5 }];
  const promotionRows: unknown[] = [];
  const rows = [productRows, galleryRows, variantRows, promotionRows];
  let selectCount = 0;
  const database = {
    select() {
      const result = rows[selectCount++]!;
      const query = {
        from() { return query; },
        leftJoin() { return query; },
        innerJoin() { return query; },
        where() { return query; },
        orderBy() { return Promise.resolve(result); },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(result).then(resolve); },
      };
      return query;
    },
  };

  const detail = await new PostgresCatalogRepository(database as never).bySlug("studio-lamp");

  assert.deepEqual(detail?.galleryImages, [
    { imageUrl: "https://cdn.example/lamp-front.jpg", sortOrder: 1 },
    { imageUrl: "https://cdn.example/lamp-side.jpg", altText: "Side view", sortOrder: 2 },
  ]);
  assert.deepEqual(detail?.variants, [{ id: "variant-1", sku: "LAMP-WHT", options: { color: "White" }, price: 89, stock: 5 }]);
  assert.equal(selectCount, 4);
});

test("repository keeps an unpublished or missing product hidden without loading its assets", async () => {
  let selectCount = 0;
  const database = {
    select() {
      selectCount += 1;
      const query = {
        from() { return query; },
        leftJoin() { return query; },
        innerJoin() { return query; },
        where() { return query; },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve([]).then(resolve); },
      };
      return query;
    },
  };

  assert.equal(await new PostgresCatalogRepository(database as never).bySlug("unpublished-lamp"), null);
  assert.equal(selectCount, 1);
});

test("public catalog list and detail queries require an active owning seller", () => {
  const repository = readFileSync(new URL("../src/modules/catalog/postgres-catalog.repository.ts", import.meta.url), "utf8");
  const activeSellerJoin = 'innerJoin(sellerProfiles, and(eq(sellerProfiles.accountId, products.sellerId), eq(sellerProfiles.status, "active")))';

  assert.equal(repository.split(activeSellerJoin).length - 1, 2);
});

test("public catalog list and detail require active categories and project only active canonical brand names", () => {
  const repository = readFileSync(new URL("../src/modules/catalog/postgres-catalog.repository.ts", import.meta.url), "utf8");
  const activeCategoryJoin = 'innerJoin(categories, and(eq(products.categoryId, categories.id), eq(categories.isActive, true)))';
  const activeBrandJoin = 'leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.isActive, true)))';

  assert.equal(repository.split(activeCategoryJoin).length - 1, 4);
  assert.equal(repository.split(activeBrandJoin).length - 1, 3);
  assert.match(repository, /brand: brands\.name/);
  assert.doesNotMatch(repository, /brand: products\.brand/);
});
