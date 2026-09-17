import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminRoutes } from "../src/modules/admin/admin.routes.js";
import type { AdminAccount } from "../src/modules/admin/admin.types.js";

const admin = { id: "admin-1", name: "Ada", email: "ada@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...admin, id: "customer-1", role: "customer" as const };

const accounts = [{
  id: "seller-1",
  name: "Bright Home",
  email: "seller@example.com",
  role: "seller" as const,
  createdAt: "2026-09-10T00:00:00.000Z",
  sellerProfile: { storeName: "Bright Home", status: "approved" as const },
  passwordHash: "must-never-leak",
  tokenHash: "must-never-leak",
  session: "must-never-leak",
}];

const dashboard = {
  products: [{ id: "product-1", name: "Studio Lamp", seller: { id: "seller-1", name: "Seller" }, stock: 3, isPublished: false, createdAt: "2026-09-10T00:00:00.000Z" }],
  orders: [{ id: "order-1", reference: "NX-ORDER-1", customer: { id: "account-1", name: "Customer" }, total: 89, status: "pending" as const, paymentStatus: "unpaid" as const, itemCount: 2, createdAt: "2026-09-10T00:00:00.000Z" }],
};

function makeApp(account: typeof admin | typeof customer | null = admin, onListAccounts: (limit: number) => Promise<AdminAccount[]> = async () => accounts) {
  const routes = createAdminRoutes({
    sessions: { async resolve() { return account; } },
    dashboard: {
      listAccounts: onListAccounts,
      async listProducts() { return dashboard.products; },
      async listOrders() { return dashboard.orders; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/admin", routes);
  return app;
}

test("admin account oversight returns a safe seller-aware bounded default list", async () => {
  let receivedLimit: number | undefined;
  const app = makeApp(admin, async (limit) => { receivedLimit = limit; return accounts; });

  const response = await app.request("http://localhost/api/admin/accounts", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 200);
  assert.equal(receivedLimit, 50);
  assert.deepEqual(await response.json(), {
    accounts: [{
      id: "seller-1",
      name: "Bright Home",
      email: "seller@example.com",
      role: "seller",
      createdAt: "2026-09-10T00:00:00.000Z",
      sellerProfile: { storeName: "Bright Home", status: "approved" },
    }],
  });
});

test("admin account oversight accepts only bounded positive integer limits", async () => {
  let receivedLimit: number | undefined;
  const app = makeApp(admin, async (limit) => { receivedLimit = limit; return []; });

  const accepted = await app.request("http://localhost/api/admin/accounts?limit=100", { headers: { Cookie: "nexamart_session=valid-token" } });
  const zero = await app.request("http://localhost/api/admin/accounts?limit=0", { headers: { Cookie: "nexamart_session=valid-token" } });
  const tooLarge = await app.request("http://localhost/api/admin/accounts?limit=101", { headers: { Cookie: "nexamart_session=valid-token" } });
  const decimal = await app.request("http://localhost/api/admin/accounts?limit=1.5", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(accepted.status, 200);
  assert.equal(receivedLimit, 100);
  for (const response of [zero, tooLarge, decimal]) assert.equal(response.status, 400);
});

test("admin account oversight returns a generic JSON 500 when account reads fail", async () => {
  const response = await makeApp(admin, async () => { throw new Error("postgres://db.internal:5432/accounts"); })
    .request("http://localhost/api/admin/accounts", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin accounts" });
});

test("admin product oversight returns a generic JSON 500 when product reads fail", async () => {
  const app = new Hono().basePath("/api");
  app.route("/admin", createAdminRoutes({
    sessions: { async resolve() { return admin; } },
    dashboard: {
      async listAccounts() { return accounts; },
      async listProducts() { throw new Error("postgres://db.internal:5432/products"); },
      async listOrders() { return dashboard.orders; },
    },
  }));

  const response = await app.request("http://localhost/api/admin/products", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin products" });
});

test("admin order summary returns a generic JSON 500 when order reads fail", async () => {
  const app = new Hono().basePath("/api");
  app.route("/admin", createAdminRoutes({
    sessions: { async resolve() { return admin; } },
    dashboard: {
      async listAccounts() { return accounts; },
      async listProducts() { return dashboard.products; },
      async listOrders() { throw new Error("postgres://db.internal:5432/orders"); },
    },
  }));

  const response = await app.request("http://localhost/api/admin/orders", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load admin orders" });
});

test("admin account oversight rejects missing and non-admin sessions", async () => {
  const missing = await makeApp(null).request("http://localhost/api/admin/accounts");
  const forbidden = await makeApp(customer).request("http://localhost/api/admin/accounts", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(missing.status, 401);
  assert.deepEqual(await missing.json(), { error: "Authentication required" });
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: "Forbidden" });
});

test("admin global search returns bounded typed seller, product, and order results", async () => {
  let received: { query: string; limit: number } | undefined;
  const app = new Hono().basePath("/api");
  app.route("/admin", createAdminRoutes({
    sessions: { async resolve() { return admin; } },
    dashboard: {
      async listAccounts() { return accounts; },
      async listProducts() { return dashboard.products; },
      async listOrders() { return dashboard.orders; },
      async search(input: { query: string; limit: number }) {
        received = input;
        return [
          { type: "seller" as const, id: "seller-1", name: "Bright Home", storeName: "Bright Home", status: "active" as const },
          { type: "product" as const, id: "product-1", name: "Studio Lamp", slug: "studio-lamp", isPublished: false },
          { type: "order" as const, id: "order-1", reference: "NX-ORDER-1", status: "pending" as const, customerName: "Customer" },
        ];
      },
    },
  }));

  const response = await app.request("http://localhost/api/admin/search?q=%20studio%20&limit=10", { headers: { Cookie: "nexamart_session=valid-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { query: "studio", limit: 10 });
  assert.deepEqual(await response.json(), {
    results: [
      { type: "seller", id: "seller-1", name: "Bright Home", storeName: "Bright Home", status: "active" },
      { type: "product", id: "product-1", name: "Studio Lamp", slug: "studio-lamp", isPublished: false },
      { type: "order", id: "order-1", reference: "NX-ORDER-1", status: "pending", customerName: "Customer" },
    ],
  });
});

test("admin global search requires a non-blank query and a bounded positive integer limit", async () => {
  const received: { query: string; limit: number }[] = [];
  const app = new Hono().basePath("/api");
  app.route("/admin", createAdminRoutes({
    sessions: { async resolve() { return admin; } },
    dashboard: {
      async listAccounts() { return accounts; },
      async listProducts() { return dashboard.products; },
      async listOrders() { return dashboard.orders; },
      async search(input: { query: string; limit: number }) { received.push(input); return []; },
    },
  }));

  const requests = await Promise.all([
    app.request("http://localhost/api/admin/search?q=lamp", { headers: { Cookie: "nexamart_session=valid-token" } }),
    app.request("http://localhost/api/admin/search?q=lamp&limit=25", { headers: { Cookie: "nexamart_session=valid-token" } }),
    app.request("http://localhost/api/admin/search?q=%20%20&limit=1", { headers: { Cookie: "nexamart_session=valid-token" } }),
    app.request("http://localhost/api/admin/search?q=lamp&limit=0", { headers: { Cookie: "nexamart_session=valid-token" } }),
    app.request("http://localhost/api/admin/search?q=lamp&limit=26", { headers: { Cookie: "nexamart_session=valid-token" } }),
  ]);

  assert.equal(requests[0].status, 200);
  assert.equal(requests[1].status, 200);
  for (const response of requests.slice(2)) assert.equal(response.status, 400);
  assert.deepEqual(received, [{ query: "lamp", limit: 10 }, { query: "lamp", limit: 25 }]);
});
