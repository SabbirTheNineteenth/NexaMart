import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Hono } from "hono";
import { createSellerQueueRoutes } from "../src/modules/seller/seller-queue.routes.js";
import { SellerQueueService } from "../src/modules/seller/services/seller-queue-service.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };

const queue = { pendingFulfillmentLines: 2, unreadNotifications: 3, productsNeedingReview: 4, outOfStockProducts: 5 };

test("seller queue returns only actionable seller-owned counts using the session identity", async () => {
  let receivedSellerId: string | undefined;
  const routes = createSellerQueueRoutes({
    sessions: { async resolve() { return seller; } },
    queue: { async overview(sellerId) { receivedSellerId = sellerId; return queue; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/queue?sellerId=attacker", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 200);
  assert.equal(receivedSellerId, seller.id);
  assert.deepEqual(await response.json(), { queue });
});

test("seller queue preserves its actionable zero state", async () => {
  const routes = createSellerQueueRoutes({
    sessions: { async resolve() { return seller; } },
    queue: { async overview() { return { pendingFulfillmentLines: 0, unreadNotifications: 0, productsNeedingReview: 0, outOfStockProducts: 0 }; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/queue", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { queue: { pendingFulfillmentLines: 0, unreadNotifications: 0, productsNeedingReview: 0, outOfStockProducts: 0 } });
});

test("seller queue rejects non-seller accounts before reading counts", async () => {
  let called = false;
  const routes = createSellerQueueRoutes({
    sessions: { async resolve() { return customer; } },
    queue: { async overview() { called = true; return queue; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/queue", { headers: { Cookie: "nexamart_session=customer-token" } });

  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("seller queue hides unexpected count failures", async () => {
  const routes = createSellerQueueRoutes({
    sessions: { async resolve() { return seller; } },
    queue: { async overview() { throw new Error("database connection refused at 10.0.0.5"); } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/queue", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load seller queue" });
});

test("seller queue service delegates the seller-scoped overview", async () => {
  let receivedSellerId: string | undefined;
  const service = new SellerQueueService({ async overview(sellerId) { receivedSellerId = sellerId; return queue; } });

  assert.deepEqual(await service.overview(seller.id), queue);
  assert.equal(receivedSellerId, seller.id);
});

test("seller queue repository counts only seller-owned actionable work without mutations", () => {
  const source = readFileSync(new URL("../src/modules/seller/postgres-seller-queue.repository.ts", import.meta.url), "utf8");

  assert.match(source, /from\(orderItems\)[\s\S]*where\(and\(eq\(orderItems\.sellerId, sellerId\), eq\(orderItems\.fulfillmentStatus, "pending"\)\)\)/);
  assert.match(source, /from\(sellerNotifications\)[\s\S]*where\(and\(eq\(sellerNotifications\.sellerId, sellerId\), isNull\(sellerNotifications\.readAt\)\)\)/);
  assert.match(source, /from\(products\)[\s\S]*where\(and\(eq\(products\.sellerId, sellerId\), inArray\(products\.moderationStatus, \["draft", "changes_requested"\]\)\)\)/);
  assert.match(source, /from\(products\)[\s\S]*where\(and\(eq\(products\.sellerId, sellerId\), eq\(products\.stock, 0\)\)\)/);
  assert.match(source, /pendingFulfillmentLines: pendingFulfillmentRows\[0\]\?\.count \?\? 0/);
  assert.match(source, /unreadNotifications: unreadNotificationRows\[0\]\?\.count \?\? 0/);
  assert.match(source, /productsNeedingReview: reviewProductRows\[0\]\?\.count \?\? 0/);
  assert.match(source, /outOfStockProducts: outOfStockProductRows\[0\]\?\.count \?\? 0/);
  assert.doesNotMatch(source, /\.(?:insert|update|delete)\(/);
});
