import assert from "node:assert/strict";
import test from "node:test";
import { toCartItems } from "../src/features/cart/cart-api.utils";

test("persistent cart lines map to storefront cart items", () => {
  assert.deepEqual(toCartItems([{ productId: "p-1", quantity: 2, name: "Studio Lamp", price: 89, image: "💡" }]), [{ id: "p-1", quantity: 2, name: "Studio Lamp", price: 89, image: "💡" }]);
});

test("persistent variant lines retain identity and server-selected price for checkout", () => {
  assert.deepEqual(toCartItems([{ productId: "p-1", variantId: "v-1", quantity: 1, name: "Studio Lamp", price: 109, image: "lamp" }]), [{ id: "p-1::v-1", productId: "p-1", variantId: "v-1", quantity: 1, name: "Studio Lamp", price: 109, image: "lamp" }]);
});
