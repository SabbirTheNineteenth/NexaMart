import assert from "node:assert/strict";
import test from "node:test";
import { SellerAnalyticsService } from "../src/modules/seller/services/seller-analytics-service.js";

const overview = {
  catalog: { productCount: 3, publishedProductCount: 2, draftProductCount: 1, totalStock: 14, outOfStockProductCount: 1 },
  orders: { orderLineCount: 4, unitsSold: 7, grossSalesAmount: "1234.50", fulfillment: { pending: 1, processing: 1, shipped: 1, delivered: 1, cancelled: 0, returned: 0 } },
};

test("seller analytics service delegates the seller-scoped overview to its repository", async () => {
  let receivedSellerId: string | undefined;
  const service = new SellerAnalyticsService({ async overview(sellerId) { receivedSellerId = sellerId; return overview; } });

  assert.deepEqual(await service.overview("seller-1"), overview);
  assert.equal(receivedSellerId, "seller-1");
});
