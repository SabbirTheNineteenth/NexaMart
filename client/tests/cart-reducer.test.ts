import assert from "node:assert/strict";
import test from "node:test";
import { cartReducer, initialCart } from "../src/features/cart/cart.reducer";

test("cart adds products, increments quantities, and calculates totals", () => {
  const product = { id: "p-1", name: "Aurora", price: 129, image: "🎧" };
  const once = cartReducer(initialCart, { type: "add", product });
  const twice = cartReducer(once, { type: "add", product });

  assert.equal(twice.items[0]?.quantity, 2);
  assert.equal(twice.totalItems, 2);
  assert.equal(twice.subtotal, 258);
});
