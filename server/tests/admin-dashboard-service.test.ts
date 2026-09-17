import assert from "node:assert/strict";
import test from "node:test";
import { AdminDashboardService } from "../src/modules/admin/services/admin-dashboard-service.js";

test("admin dashboard account oversight forwards its limit and strips unexpected sensitive fields", async () => {
  let receivedLimit: number | undefined;
  const service = new AdminDashboardService({
    async listAccounts(limit) {
      receivedLimit = limit;
      return [{
        id: "seller-1",
        name: "Bright Home",
        email: "seller@example.com",
        role: "seller",
        createdAt: "2026-09-10T00:00:00.000Z",
        sellerProfile: { storeName: "Bright Home", status: "approved" },
        passwordHash: "must-never-leak",
        tokenHash: "must-never-leak",
      }] as never;
    },
    async listProducts() { return []; },
    async listOrders() { return []; },
  });

  const accounts = await service.listAccounts(25);

  assert.equal(receivedLimit, 25);
  assert.deepEqual(accounts, [{
    id: "seller-1",
    name: "Bright Home",
    email: "seller@example.com",
    role: "seller",
    createdAt: "2026-09-10T00:00:00.000Z",
    sellerProfile: { storeName: "Bright Home", status: "approved" },
  }]);
});

test("admin dashboard search delegates its bounded typed query to the repository", async () => {
  let received: unknown;
  const service = new AdminDashboardService({
    async listAccounts() { return []; },
    async listProducts() { return []; },
    async listOrders() { return []; },
    async search(input) { received = input; return [{ type: "product" as const, id: "product-1", name: "Lamp", slug: "lamp", isPublished: true }]; },
  });

  const results = await service.search({ query: "lamp", limit: 10 });

  assert.deepEqual(received, { query: "lamp", limit: 10 });
  assert.deepEqual(results, [{ type: "product", id: "product-1", name: "Lamp", slug: "lamp", isPublished: true }]);
});
