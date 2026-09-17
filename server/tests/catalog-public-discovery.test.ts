import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createCatalogRoutes } from "../src/modules/catalog/catalog.routes.js";
import { toPublicProductDetail } from "../src/modules/catalog/catalog.types.js";

test("catalog product listing allowlists newest sorting without querying on invalid sort", async () => {
  const received: unknown[] = [];
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list(filters) {
      received.push(filters);
      return { products: [], categories: [] };
    },
    async bySlug() { return null; },
  }));

  const newest = await app.request("http://localhost/api/catalog/products?sort=newest");
  assert.equal(newest.status, 200);
  assert.deepEqual(received, [{ query: undefined, category: undefined, subcategory: undefined, brand: undefined, sort: "newest" }]);

  const invalid = await app.request("http://localhost/api/catalog/products?sort=price");
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "Invalid sort" });
  assert.equal(received.length, 1);
});

test("catalog active-deals filter accepts only active and delegates the server-enforced filter", async () => {
  const received: unknown[] = [];
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list(filters) {
      received.push(filters);
      return { products: [], categories: [] };
    },
    async bySlug() { return null; },
  }));

  const activeDeals = await app.request("http://localhost/api/catalog/products?deals=active");
  assert.equal(activeDeals.status, 200);
  assert.deepEqual(received, [{ query: undefined, category: undefined, subcategory: undefined, brand: undefined, deals: "active" }]);

  const invalid = await app.request("http://localhost/api/catalog/products?deals=all");
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "Invalid deals filter" });
  assert.equal(received.length, 1);
});

const publicProduct = {
  id: "product-1", slug: "studio-lamp", name: "Studio Lamp", category: "Home", price: 89,
  rating: 4.7, reviews: 91, image: "https://cdn.example/lamp.jpg", description: "Warm lamp",
  colors: ["White"], inStock: true, storeName: "Aurora Goods", storeSlug: "aurora-goods",
};
const publicStore = { storeName: "Aurora Goods", storeSlug: "aurora-goods", description: "Thoughtful home goods", productCount: 1 };

test("public store routes expose only repository-confirmed active stores and give generic nonleaking misses", async () => {
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list() { return { products: [], categories: [] }; },
    async bySlug() { return null; },
    async listStores() { return [publicStore]; },
    async storeBySlug(slug: string) { return slug === publicStore.storeSlug ? { store: publicStore, products: [publicProduct] } : null; },
  }));

  const list = await app.request("http://localhost/api/catalog/stores");
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), { stores: [publicStore] });

  const detail = await app.request("http://localhost/api/catalog/stores/aurora-goods");
  assert.equal(detail.status, 200);
  assert.deepEqual(await detail.json(), { store: publicStore, products: [publicProduct] });

  const hidden = await app.request("http://localhost/api/catalog/stores/suspended-store");
  assert.equal(hidden.status, 404);
  assert.deepEqual(await hidden.json(), { error: "Store not found" });
});

test("public products carry store attribution and store discovery requires a public eligible product", () => {
  const detail = toPublicProductDetail({ ...publicProduct, galleryImages: [], variants: [] });
  assert.equal(detail.storeName, "Aurora Goods");
  assert.equal(detail.storeSlug, "aurora-goods");

  const repository = readFileSync(new URL("../src/modules/catalog/postgres-catalog.repository.ts", import.meta.url), "utf8");
  assert.match(repository, /async listStores\(\)[\s\S]*innerJoin\(products, and\(eq\(products\.sellerId, sellerProfiles\.accountId\), eq\(products\.isPublished, true\)\)\)[\s\S]*innerJoin\(categories, and\(eq\(products\.categoryId, categories\.id\), eq\(categories\.isActive, true\)\)\)[\s\S]*where\(eq\(sellerProfiles\.status, "active"\)\)/);
  assert.match(repository, /async storeBySlug\(slug: string\)[\s\S]*where\(and\(eq\(sellerProfiles\.storeSlug, slug\), eq\(sellerProfiles\.status, "active"\)\)\)/);
  assert.match(repository, /filters\.sort === "newest" \? \[desc\(products\.createdAt\), asc\(products\.id\)\] : \[asc\(products\.name\)\]/);
  assert.match(repository, /orderBy\(asc\(sql`lower\(\$\{sellerProfiles\.storeName\}\)`\)\)/);
});

test("catalog search matches active product names, brands, and categories", () => {
  const repository = readFileSync(new URL("../src/modules/catalog/postgres-catalog.repository.ts", import.meta.url), "utf8");
  assert.match(repository, /ilike\(products\.name, `%\$\{query\}%`\)[\s\S]*ilike\(brands\.name, `%\$\{query\}%`\)[\s\S]*ilike\(categories\.name, `%\$\{query\}%`/);
});

test("public store failures return generic 500 responses without persistence details", async () => {
  const app = new Hono().basePath("/api");
  app.route("/catalog", createCatalogRoutes({
    async list() { return { products: [], categories: [] }; },
    async bySlug() { return null; },
    async listStores() { throw new Error('connection refused for postgres at 10.0.0.5'); },
    async storeBySlug() { throw new Error('connection refused for postgres at 10.0.0.5'); },
  }));

  for (const url of ["http://localhost/api/catalog/stores", "http://localhost/api/catalog/stores/aurora-goods"]) {
    const response = await app.request(url);
    assert.equal(response.status, 500);
    const body = await response.json() as { error: string };
    assert.equal(body.error.includes("postgres"), false);
    assert.equal(body.error.includes("10.0.0.5"), false);
  }
});
