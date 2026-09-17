import assert from "node:assert/strict";
import test from "node:test";
import { adminOverview } from "../src/features/admin/admin-overview.utils";

test("admin overview prioritizes moderation and unresolved orders", () => {
  assert.deepEqual(adminOverview({
    accounts: [{ id: "a-1", name: "Customer", email: "customer@example.com", role: "customer", createdAt: "2026-09-10T00:00:00.000Z" }],
    products: [
      { id: "p-1", slug: "draft-lamp", name: "Draft Lamp", primaryImageUrl: "https://cdn.example/draft-lamp.jpg", price: 89, category: null, seller: { id: "s-1", name: "Seller" }, stock: 0, isPublished: false, createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z", expectedRevision: "2026-09-10T00:00:00.000000+00" },
      { id: "p-2", slug: "live-chair", name: "Live Chair", primaryImageUrl: "https://cdn.example/live-chair.jpg", price: 149, category: null, seller: { id: "s-1", name: "Seller" }, stock: 5, isPublished: true, createdAt: "2026-09-10T00:00:00.000Z", updatedAt: "2026-09-10T00:00:00.000Z", expectedRevision: "2026-09-10T00:00:00.000000+00" }
    ],
    orders: [{ id: "o-1", reference: "NX-ORDER-1", customer: { id: "a-1", name: "Customer" }, total: 89, status: "pending", paymentStatus: "unpaid", items: [], createdAt: "2026-09-10T00:00:00.000Z" }],
  }), { accountCount: 1, productCount: 2, unpublishedProducts: 1, outOfStockProducts: 1, pendingOrders: 1, orderCount: 1 });
});
