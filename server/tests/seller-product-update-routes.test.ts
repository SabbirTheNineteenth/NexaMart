import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };
const editableFields = {
  name: "Updated Studio Lamp",
  description: "A warm adjustable lamp with dimmable light.",
  price: 99.5,
  primaryImageUrl: "https://cdn.example/updated-lamp.jpg",
  colors: ["White", "Black"],
};

function createApp(account: typeof seller | typeof customer = seller) {
  let received: unknown;
  const routes = createSellerRoutes({
    sessions: { async resolve() { return account; } },
    sellerCatalog: {
      async listProducts() { return []; },
      async createProduct() { return { id: "unused" }; },
      async updateStock() {},

      async updateProduct(input: unknown) { received = input; return { id: "product-1", ...input as object }; },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  return { app, received: () => received };
}

const authHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" };

test("seller detail update derives ownership from the session and only forwards editable fields", async () => {
  const { app, received } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1", {
    method: "PATCH", headers: authHeaders,
    body: JSON.stringify({ sellerId: "attacker", stock: 999, isPublished: true, status: "published", ...editableFields }),
  });

  assert.equal(response.status, 400);
  assert.equal(received(), undefined);
});

test("seller detail update forwards a valid owned update with the session seller", async () => {
  const { app, received } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify(editableFields) });

  assert.equal(response.status, 200);
  assert.deepEqual(received(), { sellerId: seller.id, productId: "product-1", ...editableFields });
});

test("seller detail update rejects non-seller sessions", async () => {
  const { app, received } = createApp(customer);
  const response = await app.request("http://localhost/api/seller/products/product-1", { method: "PATCH", headers: authHeaders, body: JSON.stringify(editableFields) });

  assert.equal(response.status, 403);
  assert.equal(received(), undefined);
});

test("seller detail update rejects direct taxonomy identifiers before catalog persistence", async () => {
  const { app, received } = createApp();
  const response = await app.request("http://localhost/api/seller/products/product-1", {
    method: "PATCH", headers: authHeaders,
    body: JSON.stringify({ name: "Updated Studio Lamp", categoryId: "11111111-1111-4111-8111-111111111111" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid product update" });
  assert.equal(received(), undefined);
});

test("seller detail update returns not found when the product is not owned", async () => {
  const routes = createSellerRoutes({
    sessions: { async resolve() { return seller; } },
    sellerCatalog: {
      async listProducts() { return []; }, async createProduct() { return { id: "unused" }; }, async updateStock() {},
      async updateProduct() { throw new Error("Product not found"); },
    },
    orders: { async listForSeller() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/products/other-seller-product", { method: "PATCH", headers: authHeaders, body: JSON.stringify(editableFields) });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Product not found" });
});
