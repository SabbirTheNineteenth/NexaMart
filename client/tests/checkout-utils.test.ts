import assert from "node:assert/strict";
import test from "node:test";
import { checkoutItems, checkoutPayload } from "../src/features/cart/checkout.utils";

test("checkout items preserve persistent product ids and quantities", () => {
  assert.deepEqual(checkoutItems([
    { id: "11111111-1111-4111-8111-111111111111", name: "Studio Lamp", price: 89, image: "💡", quantity: 2 },
    { id: "22222222-2222-4222-8222-222222222222", name: "Desk Chair", price: 240, image: "🪑", quantity: 1 },
  ]), [
    { productId: "11111111-1111-4111-8111-111111111111", quantity: 2 },
    { productId: "22222222-2222-4222-8222-222222222222", quantity: 1 },
  ]);
});

test("checkout payload binds product lines to the chosen shipping address", () => {
  assert.deepEqual(checkoutPayload([{ id: "11111111-1111-4111-8111-111111111111", quantity: 2 }] as never, "22222222-2222-4222-8222-222222222222"), { shippingAddressId: "22222222-2222-4222-8222-222222222222", items: [{ productId: "11111111-1111-4111-8111-111111111111", quantity: 2 }] });
});
