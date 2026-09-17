import assert from "node:assert/strict";
import test from "node:test";
import { WishlistService } from "../src/modules/wishlist/services/wishlist-service.js";

test("wishlist service adds an account product relationship idempotently", async () => {
  let saved: { accountId: string; productId: string } | undefined;
  const wishlist = new WishlistService({ async isProductEligible() { return true; }, async add(input: { accountId: string; productId: string }) { saved = input; }, async list() { return []; } });
  await wishlist.add({ accountId: "account-1", productId: "product-1" });
  assert.deepEqual(saved, { accountId: "account-1", productId: "product-1" });
});
