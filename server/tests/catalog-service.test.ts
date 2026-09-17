import assert from "node:assert/strict";
import test from "node:test";
import { CatalogService } from "../src/modules/catalog/services/catalog-service.js";

const headphones = { id: "p-aurora", slug: "aurora-wireless-headphones", name: "Aurora Wireless Headphones", category: "Audio", price: 129, rating: 4.8, reviews: 241, image: "https://images.example/aurora.jpg", description: "Studio sound", colors: ["Black"], inStock: true };
const lamp = { id: "p-lumen", slug: "lumen-desk-lamp", name: "Lumen Desk Lamp", category: "Home", price: 89, rating: 4.7, reviews: 91, image: "https://images.example/lumen.jpg", description: "Warm light", colors: ["White"], inStock: true };

test("catalog service delegates filtered listing to its repository", async () => {
  let receivedFilters: { query?: string; category?: string } | undefined;
  const catalog = new CatalogService({
    async list(filters) { receivedFilters = filters; return { products: [headphones], categories: [{ name: "Audio", count: 1 }] }; },
    async bySlug() { return null; },
  });
  const result = await catalog.list({ query: "headphones", category: "Audio" });

  assert.deepEqual(receivedFilters, { query: "headphones", category: "Audio" });
  assert.equal(result.products[0]?.slug, "aurora-wireless-headphones");
  assert.deepEqual(result.categories, [{ name: "Audio", count: 1 }]);
});

test("catalog service returns persistent product lookup results", async () => {
  const catalog = new CatalogService({
    async list() { return { products: [], categories: [] }; },
    async bySlug(slug) { return slug === "lumen-desk-lamp" ? lamp : null; },
  });
  assert.equal((await catalog.bySlug("lumen-desk-lamp"))?.name, "Lumen Desk Lamp");
  assert.equal(await catalog.bySlug("missing"), null);
});
