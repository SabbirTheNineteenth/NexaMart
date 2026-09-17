import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminOrderRoutes } from "../src/modules/admin/admin-order.routes.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...admin, id: "seller-1", role: "seller" as const };
const orders = [{
  id: "order-1",
  reference: "NX-ORDER-1",
  createdAt: "2026-09-11T00:00:00.000Z",
  status: "confirmed" as const,
  paymentStatus: "unpaid" as const,
  total: 258,
  customer: { id: "customer-1", name: "Sabbir" },
  items: [{
    id: "item-1",
    seller: { id: "seller-1", name: "Bright Home" },
    product: { id: "product-1", name: "Studio Lamp", imageUrl: "https://cdn.example/lamp.jpg" },
    variant: { sku: "LAMP-BLK", options: { color: "Black" } },
    quantity: 2,
    unitPrice: 129,
    fulfillmentStatus: "processing" as const,
  }],
}];

function makeApp(account: typeof admin | typeof seller | null = admin, orderReader = { async list() { return orders; } }) {
  const app = new Hono().basePath("/api");
  app.route("/admin/orders", createAdminOrderRoutes({
    sessions: { async resolve(token: string) { return token === "opaque-admin-session" ? account : null; } },
    orders: orderReader,
  }));
  return app;
}

test("admin order oversight returns safe operational order and immutable line snapshot context", async () => {
  const response = await makeApp().request("http://localhost/api/admin/orders", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { orders });
  assert.equal(JSON.stringify(body).includes("email"), false);
  assert.equal(JSON.stringify(body).includes("shippingAddress"), false);
  assert.equal(JSON.stringify(body).includes("phone"), false);
});

test("admin order oversight returns a generic JSON 500 when oversight reads fail", async () => {
  const response = await makeApp(admin, { async list() { throw new Error("postgres://db.internal:5432/order-oversight"); } })
    .request("http://localhost/api/admin/orders", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin order oversight" });
});

test("admin order oversight rejects missing opaque sessions", async () => {
  const response = await makeApp().request("http://localhost/api/admin/orders");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("admin order oversight rejects non-admin session roles", async () => {
  const response = await makeApp(seller).request("http://localhost/api/admin/orders", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});
