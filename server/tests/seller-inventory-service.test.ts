import assert from "node:assert/strict";
import test from "node:test";
import { SellerCatalogService } from "../src/modules/seller/services/seller-catalog-service.js";

test("seller catalog service updates stock only through its seller-owned repository operation", async () => {
  let received: { sellerId: string; productId: string; stock: number } | undefined;
  const catalog = new SellerCatalogService({
    async createProduct() { throw new Error("not used"); },
    async updateStock(input: { sellerId: string; productId: string; stock: number }) { received = input; return true; },
  });
  await catalog.updateStock({ sellerId: "seller-1", productId: "product-1", stock: 12 });
  assert.deepEqual(received, { sellerId: "seller-1", productId: "product-1", stock: 12 });
});
