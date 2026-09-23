import assert from "node:assert/strict";
import test from "node:test";
import { SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";

const product = { sellerId: "seller-1", name: "Studio Lamp", slug: "studio-lamp", description: "Warm adjustable lamp", primaryImageUrl: "💡", price: 89, stock: 5, colors: ["#fff"] };

test("seller catalog service delegates a validated seller product to persistence", async () => {
  let saved: typeof product | undefined;
  const catalog = new SellerCatalogService({ async listPublishedPrimaryImageReferences() { return []; }, async createProduct(input: typeof product) { saved = input; return { id: "product-1", ...input }; } });
  const created = await catalog.createProduct(product);
  assert.equal(created.id, "product-1");
  assert.deepEqual(saved, product);
});
