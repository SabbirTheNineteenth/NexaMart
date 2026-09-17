import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createWishlistRoutes } from "../src/modules/wishlist/wishlist.routes.js";

const customer = { id: "customer-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", role: "seller" as const };
const productId = "11111111-1111-4111-8111-111111111111";

const makeApp = (account: typeof customer | typeof seller | null, onRemove: (input: { accountId: string; productId: string }) => Promise<void> = async () => {}) => {
  const routes = createWishlistRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-session" ? account : null; } },
    wishlist: { async add() {}, async list() { return []; }, async remove(input: { accountId: string; productId: string }) { await onRemove(input); } },
  });
  const app = new Hono().basePath("/api");
  app.route("/wishlist", routes);
  return app;
};

const remove = (app: Hono, id = productId, cookie = "nexamart_session=opaque-session") => app.request(`http://localhost/api/wishlist/${id}`, { method: "DELETE", headers: cookie ? { Cookie: cookie } : {} });

test("wishlist removal derives the customer account from its opaque session", async () => {
  let removed: { accountId: string; productId: string } | undefined;
  const response = await remove(makeApp(customer, async (input) => { removed = input; }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { removed: true });
  assert.deepEqual(removed, { accountId: customer.id, productId });
});

test("wishlist removal is idempotently successful when the relationship is absent", async () => {
  let calls = 0;
  const app = makeApp(customer, async () => { calls += 1; });
  assert.equal((await remove(app)).status, 200);
  assert.equal((await remove(app)).status, 200);
  assert.equal(calls, 2);
});

test("wishlist removal rejects unauthenticated, non-customer, and malformed requests before removal", async () => {
  let calls = 0;
  const onRemove = async () => { calls += 1; };
  assert.equal((await remove(makeApp(null, onRemove), productId, "")).status, 401);
  assert.equal((await remove(makeApp(seller, onRemove))).status, 403);
  assert.equal((await remove(makeApp(customer, onRemove), "not-a-uuid")).status, 400);
  assert.equal(calls, 0);
});
