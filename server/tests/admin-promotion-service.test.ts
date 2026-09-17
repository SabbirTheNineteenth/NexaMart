import assert from "node:assert/strict";
import test from "node:test";
import { AdminPromotionService } from "../src/modules/admin/services/admin-promotion-service.js";

const promotions = [{
  id: "promotion-1",
  name: "Autumn lamp sale",
  scope: "product" as const,
  product: { id: "product-1", name: "Studio Lamp", imageUrl: null },
  seller: { id: "seller-1", name: "Bright Home" },
  discountPercent: 15,
  startsAt: "2026-09-15T00:00:00.000Z",
  endsAt: "2026-09-30T00:00:00.000Z",
  createdAt: "2026-09-12T00:00:00.000Z",
}];

test("admin promotion service delegates its read-only marketplace oversight feed to the repository", async () => {
  let calls = 0;
  const service = new AdminPromotionService({ async list() { calls += 1; return promotions; } });

  assert.deepEqual(await service.list(), promotions);
  assert.equal(calls, 1);
});
