import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createWishlistRoutes } from "../src/modules/wishlist/wishlist.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("wishlist read route returns only authenticated account items", async () => {
  let requestedAccountId = "";
  const routes = createWishlistRoutes({
    sessions: { async resolve() { return account; } },
    wishlist: {
      async add() {},
      async list(accountId: string) { requestedAccountId = accountId; return [{ id: "11111111-1111-4111-8111-111111111111", name: "Studio Lamp", price: 89, image: "💡" }]; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/wishlist", routes);
  const response = await app.request("http://localhost/api/wishlist/items", { headers: { Cookie: "nexamart_session=valid-token" } });
  assert.equal(response.status, 200);
  assert.equal(requestedAccountId, account.id);
  assert.deepEqual((await response.json()).items, [{ id: "11111111-1111-4111-8111-111111111111", name: "Studio Lamp", price: 89, image: "💡" }]);
});
