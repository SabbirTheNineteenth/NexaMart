import assert from "node:assert/strict";
import test from "node:test";
import { SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";

const variant = { sellerId: "seller-1", productId: "product-1", sku: "LAMP-WHT", options: { color: "White" }, price: 89, stock: 5 };

test("seller catalog service rejects a variant write when the seller does not own the product", async () => {
  const catalog = new SellerCatalogService({ async createVariant() { return null; } } as never);

  await assert.rejects(() => catalog.createVariant(variant), /Product not found/);
});

test("seller catalog service returns gallery images only after the ownership-scoped repository read", async () => {
  const images = [{ id: "image-1", imageUrl: "https://cdn.example/lamp.jpg", sortOrder: 0 }];
  let received: unknown;
  const catalog = new SellerCatalogService({ async listGalleryImages(input: unknown) { received = input; return images; } } as never);

  assert.deepEqual(await catalog.listGalleryImages({ sellerId: "seller-1", productId: "product-1" }), images);
  assert.deepEqual(received, { sellerId: "seller-1", productId: "product-1" });
});

test("seller catalog service conceals absent or unowned deleted assets", async () => {
  const catalog = new SellerCatalogService({
    async deleteVariant() { return false; },
    async deleteGalleryImage() { return false; },
  } as never);

  await assert.rejects(() => catalog.deleteVariant({ sellerId: "seller-1", productId: "other-product", variantId: "variant-1" }), /Variant not found/);
  await assert.rejects(() => catalog.deleteGalleryImage({ sellerId: "seller-1", productId: "other-product", imageId: "image-1" }), /Gallery image not found/);
});
