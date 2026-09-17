import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminRoutes } from "../src/modules/admin/admin.routes.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...admin, id: "seller-1", role: "seller" as const };

const products = [{
  id: "product-1",
  slug: "studio-lamp",
  name: "Studio Lamp",
  brand: "Nexa",
  primaryImageUrl: "https://cdn.example/studio-lamp.jpg",
  price: 89,
  stock: 3,
  isPublished: false,
  category: { id: "category-1", name: "Lighting", slug: "lighting" },
  seller: { id: "seller-1", name: "Seller", storeName: "Bright Home", storeSlug: "bright-home", status: "active" as const },
  createdAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
}];

function makeApp(account: typeof admin | typeof seller | null = admin) {
  const app = new Hono().basePath("/api");
  app.route("/admin", createAdminRoutes({
    sessions: { async resolve() { return account; } },
    dashboard: {
      async listAccounts() { return []; },
      async listProducts() { return products; },
      async listOrders() { return []; },
    },
  }));
  return app;
}

test("admin product oversight lists all product operational context without sensitive account fields", async () => {
  const response = await makeApp().request("http://localhost/api/admin/products", { headers: { Cookie: "nexamart_session=opaque-admin-session" } });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { products });
  assert.equal(JSON.stringify(body).includes("email"), false);
  assert.equal(JSON.stringify(body).includes("passwordHash"), false);
});

test("admin product oversight rejects missing opaque sessions", async () => {
  const response = await makeApp().request("http://localhost/api/admin/products");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication required" });
});

test("admin product oversight rejects non-admin session roles", async () => {
  const response = await makeApp(seller).request("http://localhost/api/admin/products", { headers: { Cookie: "nexamart_session=opaque-seller-session" } });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Forbidden" });
});
