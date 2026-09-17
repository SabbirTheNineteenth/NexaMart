import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";

const customer = { id: "customer-1", name: "Sabbir", email: "sabbir@example.com", role: "customer" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...customer, id: "seller-1", role: "seller" as const };
const productId = "11111111-1111-4111-8111-111111111111";
const variantId = "22222222-2222-4222-8222-222222222222";

const makeApp = (account: typeof customer | typeof seller | null, onRemove: (input: unknown) => Promise<void> = async () => {}) => {
  const routes = createCartRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-session" ? account : null; } },
    cart: { async addItem() {}, async listItems() { return []; }, async setQuantity() {}, async clear() {}, async removeItem(input: unknown) { await onRemove(input); } } as never,
  });
  const app = new Hono().basePath("/api");
  app.route("/cart", routes);
  return app;
};

test("cart line removal derives customer identity and preserves the requested variant", async () => {
  let removed: unknown;
  const app = makeApp(customer, async (input) => { removed = input; });

  const response = await app.request(`http://localhost/api/cart/items/${productId}?variantId=${variantId}`, {
    method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session" },
  });

  assert.equal(response.status, 204);
  assert.deepEqual(removed, { accountId: customer.id, productId, variantId });
});

test("cart line removal preserves product-only line identity and is idempotent", async () => {
  const removed: unknown[] = [];
  const app = makeApp(customer, async (input) => { removed.push(input); });
  const request = () => app.request(`http://localhost/api/cart/items/${productId}`, { method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session" } });

  assert.equal((await request()).status, 204);
  assert.equal((await request()).status, 204);
  assert.deepEqual(removed, [
    { accountId: customer.id, productId },
    { accountId: customer.id, productId },
  ]);
});

test("cart line removal rejects unauthenticated, non-customer, and malformed identities before removal", async () => {
  let calls = 0;
  const onRemove = async () => { calls += 1; };
  const remove = (app: Hono, path: string, cookie = "nexamart_session=opaque-session") => app.request(`http://localhost/api/cart/items/${path}`, { method: "DELETE", headers: cookie ? { Cookie: cookie } : {} });

  assert.equal((await remove(makeApp(null, onRemove), productId, "")).status, 401);
  assert.equal((await remove(makeApp(seller, onRemove), productId)).status, 403);
  assert.equal((await remove(makeApp(customer, onRemove), "not-a-uuid")).status, 400);
  assert.equal((await remove(makeApp(customer, onRemove), `${productId}?variantId=not-a-uuid`)).status, 400);
  assert.equal(calls, 0);
});

test("cart line removal returns a safe JSON error when removal fails", async () => {
  const app = makeApp(customer, async () => { throw new Error("database password=cart-remove-secret"); });

  const response = await app.request(`http://localhost/api/cart/items/${productId}`, {
    method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session" },
  });

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Unable to remove cart item" });
});
