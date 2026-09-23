import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";
import { TaxonomyValidationError } from "../src/modules/taxonomy/taxonomy.repository.js";

const routes = readFileSync(new URL("../src/modules/seller/seller.routes.ts", import.meta.url), "utf8");
const repository = readFileSync(new URL("../src/modules/seller/seller-catalog.repository.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../src/modules/seller/services/seller-catalog-service.ts", import.meta.url), "utf8");

test("seller product creation accepts taxonomy ids only through the approved active-taxonomy validation boundary", () => {
  assert.match(routes, /categoryId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(routes, /subcategoryId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(routes, /brandId: z\.string\(\)\.uuid\(\)\.optional\(\)/);
  assert.match(repository, /categoryId\?: string/);
  assert.match(repository, /subcategoryId\?: string/);
  assert.match(repository, /brandId\?: string/);
  assert.match(service, /validateProductClassification/);
  assert.match(service, /Subcategory does not belong to category/);
  assert.match(service, /Category is not active/);
  assert.match(service, /Brand is not active/);
});

test("seller product creation stores only active matching taxonomy and rejects mismatched classifications before persistence", async () => {
  const categoryId = "11111111-1111-4111-8111-111111111111";
  const subcategoryId = "22222222-2222-4222-8222-222222222222";
  const brandId = "33333333-3333-4333-8333-333333333333";
  const stored: Array<Record<string, unknown>> = [];
  const catalog = new SellerCatalogService({
    listPublishedPrimaryImageReferences: async () => [],
    createProduct: async (input) => {
      stored.push(input);
      return { id: "44444444-4444-4444-8444-444444444444", ...input };
    },
  } as never, {
    activeOptions: async () => ({
      categories: [{ id: categoryId, name: "Lighting", slug: "lighting" }],
      subcategories: [{ id: subcategoryId, categoryId, name: "Desk lamps", slug: "desk-lamps" }],
      brands: [{ id: brandId, name: "Nexa", slug: "nexa" }],
    }),
  });
  const input = { sellerId: "55555555-5555-4555-8555-555555555555", name: "Desk lamp", slug: "desk-lamp", description: "A focused desk lamp", primaryImageUrl: "lamp", price: 89, stock: 4, colors: ["#111111"], categoryId, subcategoryId, brandId };

  await catalog.createProduct(input);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.subcategoryId, subcategoryId);

  await assert.rejects(
    () => catalog.createProduct({ ...input, subcategoryId: "66666666-6666-4666-8666-666666666666" }),
    (error: unknown) => error instanceof TaxonomyValidationError && error.message === "Subcategory is not active",
  );
  assert.equal(stored.length, 1);

  const mismatchedCatalog = new SellerCatalogService({ listPublishedPrimaryImageReferences: async () => [], createProduct: async (value) => ({ id: "77777777-7777-4777-8777-777777777777", ...value }) } as never, {
    activeOptions: async () => ({
      categories: [{ id: categoryId, name: "Lighting", slug: "lighting" }, { id: "88888888-8888-4888-8888-888888888888", name: "Furniture", slug: "furniture" }],
      subcategories: [{ id: subcategoryId, categoryId: "88888888-8888-4888-8888-888888888888", name: "Desk lamps", slug: "desk-lamps" }],
      brands: [],
    }),
  });
  await assert.rejects(
    () => mismatchedCatalog.createProduct({ ...input, brandId: undefined }),
    (error: unknown) => error instanceof TaxonomyValidationError && error.message === "Subcategory does not belong to category",
  );
  await assert.rejects(
    () => catalog.createProduct({ ...input, brandId: "99999999-9999-4999-8999-999999999999" }),
    (error: unknown) => error instanceof TaxonomyValidationError && error.message === "Brand is not active",
  );
  assert.equal(stored.length, 1);
});
