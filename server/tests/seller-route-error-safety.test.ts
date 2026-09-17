import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const authHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" };
const databaseFailure = new Error('password authentication failed for user "postgres" at 10.0.0.5');

type CatalogMethod = "listProducts" | "listVariants" | "createVariant" | "updateVariant" | "listGalleryImages" | "createGalleryImage" | "updateGalleryImage" | "updateStock" | "updateProduct" | "createProduct";

function createApp(failingMethod: CatalogMethod, failure: unknown = databaseFailure) {
  const sellerCatalog = {
    async listProducts() { return []; },
    async listVariants() { return []; },
    async createVariant() { return { id: "variant-1" }; },
    async updateVariant() { return { id: "variant-1" }; },
    async listGalleryImages() { return []; },
    async createGalleryImage() { return { id: "image-1" }; },
    async updateGalleryImage() { return { id: "image-1" }; },

    async updateStock() {},
    async updateProduct() { return { id: "product-1" }; },
    async createProduct() { return { id: "product-1" }; },
  } as Record<CatalogMethod, () => Promise<unknown>>;
  sellerCatalog[failingMethod] = async () => { throw failure; };

  const app = new Hono().basePath("/api");
  app.route("/seller", createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: sellerCatalog as never,
    orders: { async listForSeller() { return []; } },
  }));
  return app;
}

const unexpectedFailureCases: Array<{ method: CatalogMethod; path: string; init?: RequestInit; error: string }> = [
  { method: "listProducts", path: "/products", error: "Unable to list products" },
  { method: "listVariants", path: "/products/product-1/variants", error: "Unable to list variants" },
  { method: "createVariant", path: "/products/product-1/variants", init: { method: "POST", headers: authHeaders, body: JSON.stringify({ sku: "LAMP-WHT", price: 89, stock: 5 }) }, error: "Unable to create variant" },
  { method: "updateVariant", path: "/products/product-1/variants/variant-1", init: { method: "PATCH", headers: authHeaders, body: JSON.stringify({ stock: 5 }) }, error: "Unable to update variant" },
  { method: "listGalleryImages", path: "/products/product-1/gallery-images", error: "Unable to list gallery images" },
  { method: "createGalleryImage", path: "/products/product-1/gallery-images", init: { method: "POST", headers: authHeaders, body: JSON.stringify({ imageUrl: "https://cdn.example/lamp.jpg", sortOrder: 0 }) }, error: "Unable to create gallery image" },
  { method: "updateGalleryImage", path: "/products/product-1/gallery-images/image-1", init: { method: "PATCH", headers: authHeaders, body: JSON.stringify({ sortOrder: 1 }) }, error: "Unable to update gallery image" },

  { method: "updateStock", path: "/products/product-1/stock", init: { method: "PATCH", headers: authHeaders, body: JSON.stringify({ stock: 5 }) }, error: "Unable to update stock" },
  { method: "updateProduct", path: "/products/product-1", init: { method: "PATCH", headers: authHeaders, body: JSON.stringify({ name: "Updated Studio Lamp" }) }, error: "Unable to update product" },
  { method: "createProduct", path: "/products", init: { method: "POST", headers: authHeaders, body: JSON.stringify({ name: "Studio Lamp", slug: "studio-lamp", description: "Warm adjustable lamp", primaryImageUrl: "https://cdn.example/lamp.jpg", price: 89, stock: 5, colors: ["#fff"] }) }, error: "Unable to create product" },
];

for (const failureCase of unexpectedFailureCases) {
  test(`seller ${failureCase.method} returns a safe 500 for an unexpected persistence failure`, async () => {
    const response = await createApp(failureCase.method).request(`http://localhost/api/seller${failureCase.path}`, {
      headers: { Cookie: "nexamart_session=opaque-session-token" },
      ...failureCase.init,
    });

    assert.equal(response.status, 500);
    const body = await response.json() as { error: string };
    assert.deepEqual(body, { error: failureCase.error });
    assert.equal(body.error.includes("postgres"), false);
    assert.equal(body.error.includes("10.0.0.5"), false);
  });
}

test("seller asset routes preserve not-found concealment for known ownership failures", async () => {
  const response = await createApp("createGalleryImage", new Error("Product not found")).request("http://localhost/api/seller/products/other-seller-product/gallery-images", {
    method: "POST", headers: authHeaders, body: JSON.stringify({ imageUrl: "https://cdn.example/lamp.jpg", sortOrder: 0 }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Product not found" });
});

test("seller variant creation preserves duplicate SKU conflict handling", async () => {
  const response = await createApp("createVariant", Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" })).request("http://localhost/api/seller/products/product-1/variants", {
    method: "POST", headers: authHeaders, body: JSON.stringify({ sku: "LAMP-BLK", price: 89, stock: 5 }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Variant SKU already exists" });
});

test("seller variant update preserves duplicate SKU conflict handling", async () => {
  const response = await createApp("updateVariant", Object.assign(new Error("duplicate key value violates unique constraint"), { code: "23505" })).request("http://localhost/api/seller/products/product-1/variants/variant-1", {
    method: "PATCH", headers: authHeaders, body: JSON.stringify({ sku: "LAMP-BLK" }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Variant SKU already exists" });
});

test("seller gallery image creation maps a duplicate position to a safe conflict", async () => {
  const response = await createApp("createGalleryImage", Object.assign(new Error("duplicate key value violates unique constraint product_gallery_images_product_sort_order_unique"), { code: "23505" })).request("http://localhost/api/seller/products/product-1/gallery-images", {
    method: "POST", headers: authHeaders, body: JSON.stringify({ imageUrl: "https://cdn.example/lamp.jpg", sortOrder: 0 }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Gallery image position already exists" });
});

test("seller gallery image position update maps a duplicate position to a safe conflict", async () => {
  const response = await createApp("updateGalleryImage", Object.assign(new Error("duplicate key value violates unique constraint product_gallery_images_product_sort_order_unique"), { code: "23505" })).request("http://localhost/api/seller/products/product-1/gallery-images/image-1", {
    method: "PATCH", headers: authHeaders, body: JSON.stringify({ sortOrder: 0 }),
  });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Gallery image position already exists" });
});
