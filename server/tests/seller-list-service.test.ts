import assert from "node:assert/strict";
import test from "node:test";
import { SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";

test("seller catalog service lists only the requested seller products", async () => {
  const catalog = new SellerCatalogService({
    async createProduct() { throw new Error("not used"); },
    async updateStock() { return true; },

    async listProducts(sellerId: string) { return [{ id: "product-1", sellerId, name: "Studio Lamp", stock: 5, isPublished: false }]; },
  });
  assert.deepEqual(await catalog.listProducts("seller-1"), [{ id: "product-1", sellerId: "seller-1", name: "Studio Lamp", stock: 5, isPublished: false }]);
});
