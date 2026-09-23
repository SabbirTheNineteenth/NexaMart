import assert from "node:assert/strict";
import test from "node:test";
import { SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";

const update = {
  sellerId: "seller-1",
  productId: "product-1",
  name: "Updated Studio Lamp",
  description: "A warm adjustable lamp with dimmable light.",
  price: 99.5,
  primaryImageUrl: "https://cdn.example/updated-lamp.jpg",
  colors: ["White", "Black"],
};

test("seller catalog service delegates an owned product detail update", async () => {
  let saved: typeof update | undefined;
  const catalog = new SellerCatalogService({
    async ownedPrimaryImage() { return update.primaryImageUrl; },
    async listPublishedPrimaryImageReferences() { return []; },
    async updateProduct(input: typeof update) {
      saved = input;
      return { id: input.productId, ...input };
    },
  });

  const updated = await catalog.updateProduct(update);

  assert.equal(updated.id, "product-1");
  assert.deepEqual(saved, update);
});

test("seller catalog service rejects empty detail updates before persistence", async () => {
  let called = false;
  const catalog = new SellerCatalogService({
    async updateProduct() {
      called = true;
      return null;
    },
  });

  await assert.rejects(catalog.updateProduct({ sellerId: "seller-1", productId: "product-1" }), /Invalid product update/);
  assert.equal(called, false);
});

test("seller catalog service reports a product outside the seller's ownership as not found", async () => {
  const catalog = new SellerCatalogService({ async updateProduct() { return null; } });

  await assert.rejects(catalog.updateProduct({ sellerId: "seller-1", productId: "other-seller-product", name: "Updated Lamp" }), /Product not found/);
});
