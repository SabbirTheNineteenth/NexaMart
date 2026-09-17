import assert from "node:assert/strict";
import test from "node:test";
import { SellerPromotionService } from "../src/modules/promotions/services/seller-promotion-service.js";

test("seller promotion service rejects legacy order scope and fractional-cent discounts before persistence", async () => {
  let creates = 0;
  const service = new SellerPromotionService({
    async create(input) { creates += 1; return { id: "promotion-1", ...input, createdAt: new Date(), updatedAt: new Date() }; },
    async list() { return []; },
    async withTransaction(work) { return work(this as never, {} as never); },
  } as never, { async record() {} });
  const interval = { sellerId: "seller-1", name: "Flash deal", productId: "11111111-1111-4111-8111-111111111111", startsAt: new Date("2026-10-01T00:00:00.000Z"), endsAt: new Date("2026-10-02T00:00:00.000Z") };
  await assert.rejects(service.create({ ...interval, scope: "order", discountPercent: 10 }), /product scope/);
  await assert.rejects(service.create({ ...interval, scope: "product", discountPercent: 10.001 }), /discount/i);
  assert.equal(creates, 0);
});
