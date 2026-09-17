import assert from "node:assert/strict";
import test from "node:test";
import { calculatePromotionPrice, selectActiveProductPromotion } from "../src/modules/promotions/promotion-pricing.js";

test("promotion pricing uses exact minor units and half-up cent rounding", () => {
  assert.deepEqual(calculatePromotionPrice("19.99", "12.50"), { baseUnitPrice: 19.99, effectiveUnitPrice: 17.49 });
  assert.deepEqual(calculatePromotionPrice("0.01", "50.00"), { baseUnitPrice: 0.01, effectiveUnitPrice: 0.01 });
});

test("promotion selection only applies active product scopes and resolves legacy overlaps deterministically", () => {
  const now = new Date("2026-09-13T12:00:00.000Z");
  const promotion = selectActiveProductPromotion([
    { id: "order", name: "Legacy order", scope: "order", discountPercent: "99.99", startsAt: new Date("2026-09-13T11:00:00.000Z"), endsAt: new Date("2026-09-13T13:00:00.000Z"), createdAt: new Date("2026-09-13T09:00:00.000Z") },
    { id: "later", name: "Later", scope: "product", discountPercent: "20.00", startsAt: new Date("2026-09-13T11:00:00.000Z"), endsAt: new Date("2026-09-13T13:00:00.000Z"), createdAt: new Date("2026-09-13T10:00:00.000Z") },
    { id: "winner", name: "Winner", scope: "product", discountPercent: "20.00", startsAt: new Date("2026-09-13T11:00:00.000Z"), endsAt: new Date("2026-09-13T13:00:00.000Z"), createdAt: new Date("2026-09-13T09:00:00.000Z") },
  ], now);
  assert.deepEqual(promotion?.id, "winner");
  assert.equal(selectActiveProductPromotion([{ id: "ends-now", name: "Ends now", scope: "product", discountPercent: "20.00", startsAt: new Date("2026-09-13T11:00:00.000Z"), endsAt: now, createdAt: now }], now), null);
});
