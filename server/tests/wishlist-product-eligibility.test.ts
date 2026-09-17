import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { ProductUnavailableError } from "../src/modules/cart/services/cart-service.js";
import { WishlistService } from "../src/modules/wishlist/services/wishlist-service.js";
import { createWishlistRoutes } from "../src/modules/wishlist/wishlist.routes.js";

const account = { id: "account-1", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-12T00:00:00.000Z" };
const productId = "11111111-1111-4111-8111-111111111111";

for (const reason of ["unpublished", "suspended seller", "missing seller"] as const) {
  test(`wishlist add rejects a ${reason} product as unavailable`, async () => {
    let writes = 0;
    const wishlist = new WishlistService({
      async isProductEligible() { return false; },
      async add() { writes += 1; },
      async list() { return []; },
    } as never);

    await assert.rejects(() => wishlist.add({ accountId: account.id, productId }), ProductUnavailableError);
    assert.equal(writes, 0);
  });
}

test("wishlist accepts an active seller product", async () => {
  let saved: unknown;
  const wishlist = new WishlistService({
    async isProductEligible() { return true; },
    async add(input: unknown) { saved = input; },
    async list() { return []; },
  } as never);

  await wishlist.add({ accountId: account.id, productId });
  assert.deepEqual(saved, { accountId: account.id, productId });
});

test("wishlist add returns the documented unavailable-product conflict", async () => {
  const routes = createWishlistRoutes({
    sessions: { async resolve() { return account; } },
    wishlist: {
      async add() { throw new ProductUnavailableError(); },
      async list() { return []; },
      async remove() {},
    },
  });
  const app = new Hono().basePath("/api"); app.route("/wishlist", routes);
  const response = await app.request("http://localhost/api/wishlist/items", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid" }, body: JSON.stringify({ productId }) });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "A product or variant is unavailable" });
});

test("persistent wishlist reads hide unpublished and inactive-seller rows without deleting relationships", () => {
  const source = readFileSync(new URL("../src/modules/wishlist/postgres-wishlist.repository.ts", import.meta.url), "utf8");
  assert.match(source, /sellerProfiles/);
  assert.match(source, /innerJoin\(sellerProfiles, and\(eq\(sellerProfiles\.accountId, products\.sellerId\), eq\(sellerProfiles\.status, "active"\)\)\)/);
  assert.match(source, /eq\(products\.isPublished, true\)/);
  assert.doesNotMatch(source.match(/async list[\s\S]*?(?=\n})/)?.[0] ?? "", /db\.delete\(wishlistItems\)/);
});
