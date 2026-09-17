import assert from "node:assert/strict";
import test from "node:test";
import { WishlistService } from "../src/modules/wishlist/services/wishlist-service.js";

test("wishlist service delegates an account-scoped removal to its repository", async () => {
  let removed: { accountId: string; productId: string } | undefined;
  const wishlist = new WishlistService({
    async isProductEligible() { return true; },
    async add() {},
    async list() { return []; },
    async remove(input: { accountId: string; productId: string }) { removed = input; },
  });

  await wishlist.remove({ accountId: "customer-1", productId: "product-1" });
  assert.deepEqual(removed, { accountId: "customer-1", productId: "product-1" });
});
