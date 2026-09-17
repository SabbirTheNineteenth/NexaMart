import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminRoutes } from "../src/modules/admin/admin.routes.js";
import { createCartRoutes } from "../src/modules/cart/cart.routes.js";
import { createOrderRoutes } from "../src/modules/orders/order.routes.js";
import { createReviewRoutes } from "../src/modules/reviews/review.routes.js";
import { createSellerRoutes } from "../src/modules/seller/seller.routes.js";

const customer = { id: "customer-session", name: "Customer", email: "customer@example.com", role: "customer" as const, createdAt: "2026-09-12T00:00:00.000Z" };
const seller = { id: "seller-session", name: "Seller", email: "seller@example.com", role: "seller" as const, createdAt: customer.createdAt };
const admin = { id: "admin-session", name: "Admin", email: "admin@example.com", role: "admin" as const, createdAt: customer.createdAt };
const productId = "11111111-1111-4111-8111-111111111111";
const orderItemId = "33333333-3333-4333-8333-333333333333";

const sessionHeaders = { "Content-Type": "application/json", Cookie: "nexamart_session=valid" };

function appFor(routes: { path: string; route: Hono }) {
  const app = new Hono().basePath("/api");
  app.route(routes.path, routes.route);
  return app;
}

test("cart and checkout mutations bind a spoofed customer body to the authenticated customer", async () => {
  const calls: { add?: unknown; set?: unknown; checkout?: unknown } = {};
  const cartApp = appFor({
    path: "/cart",
    route: createCartRoutes({
      sessions: { async resolve() { return customer; } },
      cart: {
        async addItem(input) { calls.add = input; }, async setQuantity(input) { calls.set = input; },
        async listItems() { return []; }, async clear() {},
      },
    }),
  });
  const checkoutApp = appFor({
    path: "/checkout",
    route: createOrderRoutes({
      sessions: { async resolve() { return customer; } },
      orders: {
        async checkout(input) { calls.checkout = input; return { id: "order-1", reference: "NX-1", customerId: customer.id, items: [], total: 1, status: "pending" as const, paymentStatus: "unpaid" as const, createdAt: customer.createdAt }; },
        async listForCustomer() { return []; }, async getTrackingForCustomer() { return null; },
      },
    }),
  });

  const [add, set, checkout] = await Promise.all([
    cartApp.request("http://localhost/api/cart/items", { method: "POST", headers: sessionHeaders, body: JSON.stringify({ accountId: "victim-account", productId, quantity: 2 }) }),
    cartApp.request(`http://localhost/api/cart/items/${productId}`, { method: "PATCH", headers: sessionHeaders, body: JSON.stringify({ accountId: "victim-account", quantity: 1 }) }),
    checkoutApp.request("http://localhost/api/checkout/orders", { method: "POST", headers: { ...sessionHeaders, "Idempotency-Key": "checkout-identity" }, body: JSON.stringify({ customerId: "victim-customer", shippingAddressId: productId, items: [{ productId, quantity: 1 }] }) }),
  ]);

  assert.equal(add.status, 201);
  assert.equal(set.status, 204);
  assert.equal(checkout.status, 201);
  assert.deepEqual(calls.add, { accountId: customer.id, productId, quantity: 2 });
  assert.deepEqual(calls.set, { accountId: customer.id, productId, quantity: 1 });
  assert.deepEqual(calls.checkout, { customerId: customer.id, shippingAddressId: productId, items: [{ productId, quantity: 1 }], idempotencyKey: "checkout-identity" });
});

test("seller product and asset writes use the session seller and conceal another seller's product", async () => {
  const calls: { product?: unknown; variant?: unknown; image?: unknown } = {};
  const app = appFor({
    path: "/seller",
    route: createSellerRoutes({
      sessions: { async resolve() { return seller; } },
      sellerCatalog: {
        async createProduct(input) { calls.product = input; return { id: productId }; },
        async createVariant(input) { calls.variant = input; throw new Error("Product not found"); },
        async createGalleryImage(input) { calls.image = input; throw new Error("Product not found"); },
      } as never,
      orders: { async listForSeller() { return []; } },
    }),
  });

  const [product, variant, image] = await Promise.all([
    app.request("http://localhost/api/seller/products", { method: "POST", headers: sessionHeaders, body: JSON.stringify({ sellerId: "victim-seller", name: "Desk Lamp", slug: "desk-lamp", description: "An adjustable desk lamp for focused work.", primaryImageUrl: "https://cdn.example/lamp.jpg", price: 49.99, stock: 3, colors: ["Black"] }) }),
    app.request(`http://localhost/api/seller/products/${productId}/variants`, { method: "POST", headers: sessionHeaders, body: JSON.stringify({ sellerId: "victim-seller", sku: "LAMP-BLACK", options: { color: "Black" }, price: 49.99, stock: 3 }) }),
    app.request(`http://localhost/api/seller/products/${productId}/gallery-images`, { method: "POST", headers: sessionHeaders, body: JSON.stringify({ sellerId: "victim-seller", imageUrl: "https://cdn.example/lamp-detail.jpg", sortOrder: 0 }) }),
  ]);

  assert.equal(product.status, 201);
  assert.equal(variant.status, 404);
  assert.equal(image.status, 404);
  assert.deepEqual(calls.product, { sellerId: seller.id, name: "Desk Lamp", slug: "desk-lamp", description: "An adjustable desk lamp for focused work.", primaryImageUrl: "https://cdn.example/lamp.jpg", price: 49.99, stock: 3, colors: ["Black"] });
  assert.deepEqual(calls.variant, { sellerId: seller.id, productId, sku: "LAMP-BLACK", options: { color: "Black" }, price: 49.99, stock: 3 });
  assert.deepEqual(calls.image, { sellerId: seller.id, productId, imageUrl: "https://cdn.example/lamp-detail.jpg", sortOrder: 0 });
  assert.deepEqual(await variant.json(), { error: "Product not found" });
  assert.deepEqual(await image.json(), { error: "Product not found" });
});

test("review eligibility and submission remain scoped to the customer session", async () => {
  const calls: { eligible?: string; create?: unknown } = {};
  const reviews = {
    async list() { return []; },
    async listEligibleForCustomer(customerId: string) { calls.eligible = customerId; return [{ product: { id: productId, name: "Desk Lamp", image: null }, orderItem: { id: orderItemId }, order: { id: "order-1", reference: "NX-1" } }]; },
    async create(input: unknown) { calls.create = input; return { id: "review-1" }; },
  };
  const customerApp = appFor({ path: "/reviews", route: createReviewRoutes({ sessions: { async resolve() { return customer; } }, reviews }) });
  const sellerApp = appFor({ path: "/reviews", route: createReviewRoutes({ sessions: { async resolve() { return seller; } }, reviews }) });

  const [eligible, submission, forbidden] = await Promise.all([
    customerApp.request("http://localhost/api/reviews/eligible", { headers: sessionHeaders }),
    customerApp.request("http://localhost/api/reviews", { method: "POST", headers: sessionHeaders, body: JSON.stringify({ customerId: "victim-customer", productId, orderItemId, rating: 5, title: "Reliable", body: "Worked well every day." }) }),
    sellerApp.request("http://localhost/api/reviews/eligible", { headers: sessionHeaders }),
  ]);

  assert.equal(eligible.status, 200);
  assert.equal(submission.status, 201);
  assert.equal(forbidden.status, 403);
  assert.equal(calls.eligible, customer.id);
  assert.deepEqual(calls.create, { customerId: customer.id, productId, orderItemId, rating: 5, title: "Reliable", body: "Worked well every day." });
  assert.deepEqual(await forbidden.json(), { error: "Forbidden" });
});

test("admin dashboard role guards block unauthenticated and non-admin callers before any data read", async () => {
  let reads = 0;
  const dashboard = {
    async listAccounts() { reads += 1; return []; },
    async listProducts() { reads += 1; return []; },
    async listOrders() { reads += 1; return []; },
  };
  const makeApp = (account: typeof admin | typeof customer | null) => appFor({ path: "/admin", route: createAdminRoutes({ sessions: { async resolve() { return account; } }, dashboard }) });
  const endpoints = ["accounts", "products", "orders"];

  const missing = await Promise.all(endpoints.map((endpoint) => makeApp(null).request(`http://localhost/api/admin/${endpoint}`)));
  const forbidden = await Promise.all(endpoints.map((endpoint) => makeApp(customer).request(`http://localhost/api/admin/${endpoint}`, { headers: sessionHeaders })));
  const allowed = await Promise.all(endpoints.map((endpoint) => makeApp(admin).request(`http://localhost/api/admin/${endpoint}`, { headers: sessionHeaders })));

  for (const response of missing) assert.equal(response.status, 401);
  for (const response of forbidden) assert.equal(response.status, 403);
  for (const response of allowed) assert.equal(response.status, 200);
  assert.equal(reads, endpoints.length);
});
