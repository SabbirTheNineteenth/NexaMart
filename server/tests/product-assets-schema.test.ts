import assert from "node:assert/strict";
import test from "node:test";
import { productGalleryImages, productVariants } from "../src/db/schema/index.js";

test("product variant schema stores a product-owned SKU, option values, price, and stock", () => {
  assert.equal(productVariants[Symbol.for("drizzle:Name")], "product_variants");
  assert.equal(productVariants.productId.name, "product_id");
  assert.equal(productVariants.sku.name, "sku");
  assert.equal(productVariants.options.name, "options");
  assert.equal(productVariants.price.name, "price");
  assert.equal(productVariants.stock.name, "stock");
});

test("product gallery image schema stores a product-owned ordered image", () => {
  assert.equal(productGalleryImages[Symbol.for("drizzle:Name")], "product_gallery_images");
  assert.equal(productGalleryImages.productId.name, "product_id");
  assert.equal(productGalleryImages.imageUrl.name, "image_url");
  assert.equal(productGalleryImages.sortOrder.name, "sort_order");
});
