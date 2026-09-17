import assert from "node:assert/strict";
import test from "node:test";
import { CartService } from "../src/modules/cart/services/cart-service.js";

const noItems = async () => [];

test("cart service adds a quantity only when product stock is available", async () => {
  let saved: { accountId: string; productId: string; quantity: number } | undefined;
  const cart = new CartService({
    async availableStock() { return 3; },
    async existingQuantity() { return 0; },
    listItems: noItems,
    async setQuantity(input: { accountId: string; productId: string; quantity: number }) { saved = input; },
  });
  await cart.addItem({ accountId: "account-1", productId: "product-1", quantity: 2 });
  assert.deepEqual(saved, { accountId: "account-1", productId: "product-1", quantity: 2 });
});

test("cart service rejects quantities above available stock", async () => {
  let writes = 0;
  const cart = new CartService({ async availableStock() { return 1; }, async existingQuantity() { return 0; }, listItems: noItems, async setQuantity() { writes += 1; } });
  await assert.rejects(() => cart.addItem({ accountId: "account-1", productId: "product-1", quantity: 2 }), /Insufficient stock/);
  assert.equal(writes, 0);
});

test("cart service reads only the requested account cart", async () => {
  const cart = new CartService({
    async availableStock() { return 0; },
    async existingQuantity() { return 0; },
    async setQuantity() {}, async clear() {},
    async listItems(accountId: string) { return [{ accountId, productId: "product-1", quantity: 1, name: "Studio Lamp", price: 89, image: "💡" }]; },
  });
  assert.deepEqual(await cart.listItems("account-1"), [{ accountId: "account-1", productId: "product-1", quantity: 1, name: "Studio Lamp", price: 89, image: "💡" }]);
});

test("cart service rejects an addition when the combined line quantity exceeds stock", async () => {
  let writes = 0;
  const cart = new CartService({
    async availableStock() { return 3; },
    async existingQuantity() { return 2; },
    listItems: noItems,
    async setQuantity() { writes += 1; },
  });
  await assert.rejects(() => cart.addItem({ accountId: "account-1", productId: "product-1", quantity: 2 }), /Insufficient stock/);
  assert.equal(writes, 0);
});

test("cart service removes only the requested account product variant line", async () => {
  let removed: unknown;
  const cart = new CartService({
    async availableStock() { return null; }, async existingQuantity() { return 0; }, async listItems() { return []; }, async setQuantity() {}, async clear() {},
    async removeItem(input: unknown) { removed = input; },
  } as never);

  await cart.removeItem({ accountId: "account-1", productId: "product-1", variantId: "variant-1" });
  assert.deepEqual(removed, { accountId: "account-1", productId: "product-1", variantId: "variant-1" });
});
