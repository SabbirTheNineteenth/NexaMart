import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminPromotionRoutes } from "../src/modules/admin/admin-promotion.routes.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...admin, id: "seller-1", role: "seller" as const };
const promotions = [{
  id: "promotion-1",
  name: "Autumn lamp sale",
  scope: "product" as const,
  product: { id: "product-1", name: "Studio Lamp", imageUrl: "https://cdn.example/lamp.jpg" },
  seller: { id: "seller-1", name: "Bright Home" },
  discountPercent: 15,
  startsAt: "2026-09-15T00:00:00.000Z",
  endsAt: "2026-09-30T00:00:00.000Z",
  createdAt: "2026-09-12T00:00:00.000Z",
}];

function makeApp(account: typeof admin | typeof seller | null = admin, promotionReader = { async list() { return promotions; } }) {
  const app = new Hono().basePath("/api");
  app.route("/admin/promotions", createAdminPromotionRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-admin-session" ? account : null; } },
    promotions: promotionReader,
  }));
  return app;
}

test("admin promotion oversight returns safe marketplace promotion records", async () => {
  const response = await makeApp().request("http://localhost/api/admin/promotions", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { promotions });
  assert.equal(JSON.stringify(body).includes("email"), false);
  assert.equal(JSON.stringify(body).includes("password"), false);
  assert.equal(JSON.stringify(body).includes("phone"), false);
});

test("admin promotion oversight returns a generic JSON 500 when promotion reads fail", async () => {
  const response = await makeApp(admin, { async list() { throw new Error("postgres://db.internal:5432/promotions"); } })
    .request("http://localhost/api/admin/promotions", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin promotions" });
});

test("admin promotion oversight rejects missing opaque sessions", async () => {
  const response = await makeApp().request("http://localhost/api/admin/promotions");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("admin promotion oversight rejects non-admin session roles", async () => {
  const response = await makeApp(seller).request("http://localhost/api/admin/promotions", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});
