import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createSellerNotificationRoutes } from "../src/modules/notifications/seller-notification.routes.js";
import { AdminProductService } from "../src/modules/admin/services/admin-product-service.js";

const account = { id: "seller-1", name: "Seller", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-16T00:00:00.000Z" };
const notification = { id: "11111111-1111-4111-8111-111111111111", type: "order_line_created" as const, title: "New order line", body: "Studio Lamp × 2", readAt: null, createdAt: "2026-09-16T00:00:00.000Z" };

test("seller notification schema is durable and migration remains explicitly unapplied", () => {
  const schema = readFileSync(new URL("../src/db/schema/index.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../src/db/migrations/0020_seller_notifications.sql", import.meta.url), "utf8");
  const journal = readFileSync(new URL("../src/db/migrations/meta/_journal.json", import.meta.url), "utf8");
  assert.match(schema, /sellerNotifications = pgTable\("seller_notifications"/);
  assert.match(schema, /sellerId: uuid\("seller_id"\)/);
  assert.match(schema, /readAt: timestamp\("read_at"/);
  assert.match(migration, /Unapplied by design/);
  assert.match(migration, /CREATE TABLE "seller_notifications"/);
  assert.match(journal, /"tag": "0020_seller_notifications"/);
});

test("seller notification routes are role and ownership scoped and safely mark one owned row read", async () => {
  let listSellerId: string | undefined;
  let readInput: { sellerId: string; notificationId: string } | undefined;
  const app = new Hono().basePath("/api");
  app.route("/seller/notifications", createSellerNotificationRoutes({
    sessions: { async resolve() { return account; } },
    notifications: {
      async listForSeller(sellerId) { listSellerId = sellerId; return { notifications: [notification], unreadCount: 1 }; },
      async markRead(input) { readInput = input; return notification; },
    },
  }));
  const headers = { Cookie: "nexamart_session=opaque" };
  const listed = await app.request("http://localhost/api/seller/notifications", { headers });
  assert.equal(listed.status, 200);
  assert.deepEqual(await listed.json(), { notifications: [notification], unreadCount: 1 });
  assert.equal(listSellerId, account.id);
  const updated = await app.request(`http://localhost/api/seller/notifications/${notification.id}/read`, { method: "PATCH", headers });
  assert.equal(updated.status, 200);
  assert.deepEqual(readInput, { sellerId: account.id, notificationId: notification.id });
  assert.deepEqual(await updated.json(), { notification });
});

test("moderation and checkout emit seller notifications through their transaction seam and fail closed without it", () => {
  const moderation = readFileSync(new URL("../src/modules/admin/services/admin-product-service.ts", import.meta.url), "utf8");
  const orders = readFileSync(new URL("../src/modules/orders/postgres-order.repository.ts", import.meta.url), "utf8");
  assert.match(moderation, /notifications\.recordModerationDecision\([\s\S]*database/);
  assert.match(moderation, /Notification support is required for product moderation/);
  assert.match(orders, /this\.notifications\.recordOrderLineCreated\([\s\S]*tx/);
  assert.match(orders, /Notification support is required for checkout/);
});

test("moderation records the seller event in the same transaction and rejects an unavailable notification dependency before writing", async () => {
  const transaction = {};
  let moderated = false;
  let notificationDatabase: unknown;
  const repository = {
    async moderate() { moderated = true; return { kind: "updated" as const, product: { id: "product-1", name: "Studio Lamp", seller: { id: "seller-1" } } }; },
    async withTransaction(work: any) { return work(repository, transaction); },
  };
  const service = new AdminProductService(repository as any, { async record() {} }, { async recordModerationDecision(_input, database) { notificationDatabase = database; } });
  await service.moderate({ productId: "product-1", status: "approved", expectedRevision: "revision", adminId: "admin-1" });
  assert.equal(moderated, true);
  assert.equal(notificationDatabase, transaction);

  moderated = false;
  const withoutNotifications = new AdminProductService(repository as any, { async record() {} });
  await assert.rejects(() => withoutNotifications.moderate({ productId: "product-1", status: "approved", expectedRevision: "revision", adminId: "admin-1" }), /Notification support is required/);
  assert.equal(moderated, false);
});
