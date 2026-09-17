import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { toCartItems } from "../src/features/cart/cart-api.utils";
import { cartReducer, initialCart } from "../src/features/cart/cart.reducer";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const storePage = readFileSync(new URL("../src/features/catalog/PublicStorePage.tsx", import.meta.url), "utf8");
const sellerForm = readFileSync(new URL("../src/features/seller/SellerPromotionForm.tsx", import.meta.url), "utf8");
const sellerEditor = readFileSync(new URL("../src/features/seller/SellerPromotionEditor.tsx", import.meta.url), "utf8");
const adminDashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("cart hydrates server effective prices and totals them without calculating a discount", () => {
  const items = toCartItems([{ productId: "p-1", quantity: 2, name: "Studio Lamp", basePrice: 120, effectivePrice: 90, promotion: { id: "offer-1", name: "Flash", discountPercent: 25, endsAt: "2026-09-13T12:30:00.000Z" }, image: "💡" }]);
  const cart = cartReducer(initialCart, { type: "hydrate", items });

  assert.equal(cart.items[0]?.price, 90);
  assert.equal(cart.items[0]?.basePrice, 120);
  assert.equal(cart.subtotal, 180);
});

test("customer explore surfaces show only the current server price", () => {
  for (const source of [storefront, detail, storePage]) {
    assert.match(source, /effectivePrice/);
    assert.doesNotMatch(source, /flashOfferPresentation|flash-offer|basePrice|discountPercent/);
  }
});

test("seller creates only product flash offers and tells sellers how to recover from overlap conflicts", () => {
  assert.match(sellerForm, /Product flash offer/);
  assert.doesNotMatch(sellerForm, /name="scope"|value="order"|Entire order/);
  assert.match(sellerForm, /scope: "product"/);
  assert.match(sellerForm, /reason instanceof ApiError && reason\.status === 409/);
  assert.match(sellerForm, /overlaps an existing product flash offer/i);
  assert.match(sellerEditor, /reason instanceof ApiError && reason\.status === 409/);
});

test("admin promotion oversight is read-only and marks legacy order records as non-price-applicable", () => {
  const panel = adminDashboard.slice(adminDashboard.indexOf('className="admin-panel admin-promotion-oversight"'), adminDashboard.indexOf('className="admin-panel admin-reviews"'));
  assert.match(panel, /Legacy order-scope record — not price-applicable/);
  assert.match(panel, /read-only/i);
  assert.doesNotMatch(panel, /<button[^>]*>(?:Edit|Delete|Save|Activate|Deactivate)/i);
});
