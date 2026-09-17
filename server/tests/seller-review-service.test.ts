import assert from "node:assert/strict";
import test from "node:test";
import { SellerReviewService } from "../src/modules/seller/services/seller-review-service.js";

const review = {
  id: "review-1",
  product: { id: "product-1", name: "Studio Lamp" },
  rating: 5,
  title: "Excellent",
  body: "Built to last.",
  createdAt: "2026-09-11T00:00:00.000Z",
  isVisible: true,
};

test("seller review service delegates an ownership-scoped read to its repository", async () => {
  let requestedSellerId = "";
  const service = new SellerReviewService({
    async listForSeller(sellerId) {
      requestedSellerId = sellerId;
      return [review];
    },
  });

  assert.deepEqual(await service.listForSeller("seller-1"), [review]);
  assert.equal(requestedSellerId, "seller-1");
});
