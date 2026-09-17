import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { cartReducer, initialCart } from "../src/features/cart/cart.reducer";
import { cartRemovalPath, toCartItems } from "../src/features/cart/cart-api.utils";
import { checkoutItems } from "../src/features/cart/checkout.utils";

const hook = readFileSync(new URL("../src/hooks/useCart.ts", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

test("cart removal requests the product endpoint with an optional encoded variant", () => {
  assert.equal(cartRemovalPath("product-1"), "/cart/items/product-1");
  assert.equal(cartRemovalPath("product / 1", "variant & blue"), "/cart/items/product%20%2F%201?variantId=variant+%26+blue");
});

test("persistent variant cart lines keep distinct local identities", () => {
  assert.deepEqual(
    toCartItems([
      { productId: "product-1", quantity: 1, name: "Lamp", price: 89, image: "💡" },
      { productId: "product-1", variantId: "blue", quantity: 2, name: "Lamp", price: 99, image: "💡" },
    ]),
    [
      { id: "product-1", quantity: 1, name: "Lamp", price: 89, image: "💡" },
      { id: "product-1::blue", productId: "product-1", variantId: "blue", quantity: 2, name: "Lamp", price: 99, image: "💡" },
    ],
  );
});

test("cart removal removes only the requested variant line", () => {
  const state = cartReducer(initialCart, {
    type: "hydrate",
    items: [
      { id: "product-1", productId: "product-1", quantity: 1, name: "Lamp", price: 89, image: "💡" },
      { id: "product-1::blue", productId: "product-1", variantId: "blue", quantity: 2, name: "Lamp", price: 99, image: "💡" },
    ],
  });

  assert.deepEqual(cartReducer(state, { type: "remove", id: "product-1::blue" }).items, [
    { id: "product-1", productId: "product-1", quantity: 1, name: "Lamp", price: 89, image: "💡" },
  ]);
});

test("checkout uses a variant line's product and variant identifiers", () => {
  assert.deepEqual(checkoutItems([{ id: "product-1::blue", productId: "product-1", variantId: "blue", quantity: 2, name: "Lamp", price: 99, image: "💡" }]), [{ productId: "product-1", variantId: "blue", quantity: 2 }]);
});

test("cart removal waits for the delete request before changing local state", () => {
  assert.match(hook, /const remove = async \(item: CartItem\) => \{/);
  assert.match(hook, /await deleteJSON<void>\(cartRemovalPath\(item\.productId \?\? item\.id, item\.variantId\)\);/);
  assert.match(hook, /dispatch\(\{ type: "remove", id: item\.id \}\);/);
});

test("cart removal offers a named, disabled pending control and a recoverable error", () => {
  assert.match(storefront, /Removing…/);
  assert.match(storefront, /disabled=\{cart\.removingItemId === item\.id\}/);
  assert.match(storefront, /aria-label=\{`Remove \$\{item\.name\} from bag`\}/);
  assert.match(storefront, /Unable to remove \$\{item\.name\}\. Try again\./);
});

test("only the cart line with an active removal or quantity update is marked busy", () => {
  assert.match(storefront, /className="cart-item" key=\{item\.id\} aria-busy=\{cart\.removingItemId === item\.id \|\| quantityUpdate\?\.state === "pending"\}/);
});
