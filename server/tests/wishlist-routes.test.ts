import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createWishlistRoutes } from "../src/modules/wishlist/wishlist.routes.js";

const account = { id: "account-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };

test("wishlist add route binds an authenticated account to its product", async () => {
  let saved: { accountId: string; productId: string } | undefined;
  const routes = createWishlistRoutes({
    sessions: { async resolve() { return account; } },
    wishlist: { async add(input: { accountId: string; productId: string }) { saved = input; }, async list() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/wishlist", routes);
  const response = await app.request("http://localhost/api/wishlist/items", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=valid-token" }, body: JSON.stringify({ productId: "11111111-1111-4111-8111-111111111111" }) });
  assert.equal(response.status, 201);
  assert.deepEqual(saved, { accountId: account.id, productId: "11111111-1111-4111-8111-111111111111" });
});
