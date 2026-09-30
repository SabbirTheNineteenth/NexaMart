import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerFulfillmentRoutes } from "../src/modules/seller/seller-fulfillment.routes.js";
import { isSellerFulfillmentTransitionAllowed, SellerFulfillmentService } from "../src/modules/seller/services/seller-fulfillment-service.js";
import { orders } from "../src/db/schema/index.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const customer = { ...seller, id: "customer-1", role: "customer" as const };

const fulfillmentDatabase = (fulfillmentStatus: "pending" | "processing" | "packed" | "delivered", commissionStatus: "accrued" | "eligible" = "accrued", sellerActive?: boolean, stale = false, orderStatus: "pending" | "confirmed" = "confirmed") => {
  const updates: unknown[] = [];
  const events: unknown[] = [];
  const operations: string[] = [];
  const commission = { status: commissionStatus };
  let transaction: unknown;
  const database = {
    async transaction(work: (tx: unknown) => Promise<unknown>) { transaction = database; return work(database); },
    async execute() { operations.push(operations.length === 0 ? "order-item-lock" : operations.length === 1 ? "order-event-lock" : "next-event-sequence"); return { rows: [{ sequence: 3 }] }; },
    select() {
      let joinedSellerProfile = false;
      const query = {
        from(table: unknown) { if (table === orders) return { where() { return { limit: async () => [{ status: orderStatus }] }; } }; return query; },
        innerJoin() { joinedSellerProfile = true; return query; },
        where() { return query; },
        limit() { return Promise.resolve(sellerActive === false && joinedSellerProfile ? [] : [{ id: "item-1", orderId: "order-1", fulfillmentStatus }]); },
      };
      return query;
    },
    update() {
      const query = {
        set(values: unknown) { updates.push(values); if ((values as { status?: string }).status === "void") commission.status = "void"; return query; },
        where() { return query; },
        returning() {
          const values = updates.at(-1) as { fulfillmentStatus?: string };
          return Promise.resolve(stale ? [] : [{ orderId: "order-1", fulfillmentStatus: values.fulfillmentStatus }]);
        },
      };
      return query;
    },
    insert() {
      return { values(event: unknown) { events.push(event); return Promise.resolve(); } };
    },
  };
  return { database, updates, events, operations, commission, transaction: () => transaction };
};

test("seller cannot move a COD line before Admin approval", async () => {
  const state = fulfillmentDatabase("pending", "accrued", true, false, "pending");
  await assert.rejects(new SellerFulfillmentService(state.database as never).transition({ sellerId: seller.id, orderItemId: "item-1", status: "processing" }), { code: "INVALID_FULFILLMENT_TRANSITION" });
  assert.deepEqual(state.updates, []);
  assert.deepEqual(state.events, []);
});

test("seller cancellation voids its accrued commission in the fulfillment transaction while retaining the event", async () => {
  const state = fulfillmentDatabase("pending");

  await new SellerFulfillmentService(state.database as never).transition({ sellerId: seller.id, orderItemId: "item-1", status: "cancelled" });

  assert.equal(state.transaction(), state.database);
  assert.deepEqual(state.updates, [{ fulfillmentStatus: "cancelled" }, { status: "void" }]);
  assert.equal(state.commission.status, "void");
  assert.deepEqual(state.events, [{ orderId: "order-1", orderItemId: "item-1", actorId: seller.id, eventType: "fulfillment_updated", fromStatus: "pending", toStatus: "cancelled", sequence: 3 }]);
});

test("seller return voids its accrued commission in the fulfillment transaction while retaining the event", async () => {
  const state = fulfillmentDatabase("delivered");

  await new SellerFulfillmentService(state.database as never).transition({ sellerId: seller.id, orderItemId: "item-1", status: "returned" });

  assert.equal(state.transaction(), state.database);
  assert.deepEqual(state.updates, [{ fulfillmentStatus: "returned" }, { status: "void" }]);
  assert.equal(state.commission.status, "void");
  assert.deepEqual(state.events, [{ orderId: "order-1", orderItemId: "item-1", actorId: seller.id, eventType: "fulfillment_updated", fromStatus: "delivered", toStatus: "returned", sequence: 3 }]);
});

test("seller return takes the review eligibility order-item lock before reading delivered state", async () => {
  const state = fulfillmentDatabase("delivered");

  await new SellerFulfillmentService(state.database as never).transition({ sellerId: seller.id, orderItemId: "item-1", status: "returned" });

  assert.deepEqual(state.operations, ["order-item-lock", "order-event-lock", "next-event-sequence"]);
});

test("seller fulfillment permits only the UI-supported status transitions", () => {
  assert.equal(isSellerFulfillmentTransitionAllowed("pending", "processing"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("processing", "packed"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("packed", "shipped"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("pending", "cancelled"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("processing", "shipped"), false);
  assert.equal(isSellerFulfillmentTransitionAllowed("processing", "cancelled"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("shipped", "delivered"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("delivered", "returned"), true);
  assert.equal(isSellerFulfillmentTransitionAllowed("cancelled", "processing"), false);
  assert.equal(isSellerFulfillmentTransitionAllowed("returned", "shipped"), false);
  assert.equal(isSellerFulfillmentTransitionAllowed("pending", "packed"), false);
  assert.equal(isSellerFulfillmentTransitionAllowed("packed", "delivered"), false);
});

test("seller packed transition writes its ordered timeline event in the same transaction", async () => {
  const state = fulfillmentDatabase("processing");

  await new SellerFulfillmentService(state.database as never).transition({ sellerId: seller.id, orderItemId: "item-1", status: "packed" });

  assert.equal(state.transaction(), state.database);
  assert.deepEqual(state.updates, [{ fulfillmentStatus: "packed" }]);
  assert.deepEqual(state.events, [{ orderId: "order-1", orderItemId: "item-1", actorId: seller.id, eventType: "fulfillment_updated", fromStatus: "processing", toStatus: "packed", sequence: 3 }]);
});

test("seller fulfillment status transitions are bound to the authenticated seller", async () => {
  let received: { sellerId: string; orderItemId: string; status: "processing" | "shipped" | "delivered" } | undefined;
  const routes = createSellerFulfillmentRoutes({
    sessions: { async resolve() { return seller; } },
    fulfillment: { async transition(input) { received = input; return { orderId: "order-1", fulfillmentStatus: input.status }; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ sellerId: "attacker", status: "shipped" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { sellerId: seller.id, orderItemId: "item-1", status: "shipped" });
  assert.deepEqual(await response.json(), { fulfillment: { orderId: "order-1", fulfillmentStatus: "shipped" } });
});

test("seller fulfillment endpoint accepts a seller cancellation and uses the session seller", async () => {
  let received: { sellerId: string; orderItemId: string; status: string } | undefined;
  const routes = createSellerFulfillmentRoutes({
    sessions: { async resolve() { return seller; } },
    fulfillment: { async transition(input) { received = input; return { orderId: "order-1", fulfillmentStatus: input.status }; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ sellerId: "attacker", status: "cancelled" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { sellerId: seller.id, orderItemId: "item-1", status: "cancelled" });
  assert.deepEqual(await response.json(), { fulfillment: { orderId: "order-1", fulfillmentStatus: "cancelled" } });
});

test("seller fulfillment endpoint accepts a seller return", async () => {
  let received: { sellerId: string; orderItemId: string; status: string } | undefined;
  const routes = createSellerFulfillmentRoutes({
    sessions: { async resolve() { return seller; } },
    fulfillment: { async transition(input) { received = input; return { orderId: "order-1", fulfillmentStatus: input.status }; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
    body: JSON.stringify({ status: "returned" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, { sellerId: seller.id, orderItemId: "item-1", status: "returned" });
  assert.deepEqual(await response.json(), { fulfillment: { orderId: "order-1", fulfillmentStatus: "returned" } });
});

test("seller fulfillment endpoint rejects malformed statuses", async () => {
  let calls = 0;
  const routes = createSellerFulfillmentRoutes({ sessions: { async resolve() { return seller; } }, fulfillment: { async transition() { calls += 1; throw new Error("unexpected"); } } });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" }, body: JSON.stringify({ status: "lost" }) });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid fulfillment status" });
  assert.equal(calls, 0);
});

test("seller fulfillment endpoint rejects customers", async () => {
  const routes = createSellerFulfillmentRoutes({ sessions: { async resolve() { return customer; } }, fulfillment: { async transition() { throw new Error("unexpected"); } } });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);
  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=customer-token" }, body: JSON.stringify({ status: "processing" }) });
  assert.equal(response.status, 403);
});

test("seller fulfillment conceals missing and unowned order items with 404", async () => {
  const missing = Object.assign(new Error("Order item lookup failed for internal tenant secret-fulfillment-detail"), { code: "ORDER_ITEM_NOT_FOUND" });
  const routes = createSellerFulfillmentRoutes({ sessions: { async resolve() { return seller; } }, fulfillment: { async transition() { throw missing; } } });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/another-sellers-item/fulfillment", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" }, body: JSON.stringify({ status: "processing" }) });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Order item not found" });
});

test("seller fulfillment conceals a seller suspended after authorization and writes no cancellation or return side effects", async () => {
  for (const [currentStatus, status] of [["pending", "cancelled"], ["delivered", "returned"]] as const) {
    const state = fulfillmentDatabase(currentStatus, "accrued", false);
    const routes = createSellerFulfillmentRoutes({
      sessions: { async resolve() { return seller; } },
      fulfillment: new SellerFulfillmentService(state.database as never),
    });
    const app = new Hono().basePath("/api");
    app.route("/seller", routes);

    const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" },
      body: JSON.stringify({ status }),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Order item not found" });
    assert.deepEqual(state.updates, []);
    assert.equal(state.commission.status, "accrued");
    assert.deepEqual(state.events, []);
  }
});

test("seller fulfillment reserves 409 for invalid state transitions", async () => {
  const invalidTransition = Object.assign(new Error("Transition record contains secret-fulfillment-detail"), { code: "INVALID_FULFILLMENT_TRANSITION" });
  const routes = createSellerFulfillmentRoutes({ sessions: { async resolve() { return seller; } }, fulfillment: { async transition() { throw invalidTransition; } } });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" }, body: JSON.stringify({ status: "delivered" }) });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Invalid fulfillment transition" });
});

test("seller fulfillment returns 409 without a timeline event when the status becomes stale at the guarded update", async () => {
  const state = fulfillmentDatabase("processing", "accrued", true, true);
  const routes = createSellerFulfillmentRoutes({ sessions: { async resolve() { return seller; } }, fulfillment: new SellerFulfillmentService(state.database as never) });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" }, body: JSON.stringify({ status: "packed" }) });

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Invalid fulfillment transition" });
  assert.deepEqual(state.events, []);
});

test("seller fulfillment does not classify unexpected persistence failures as conflicts", async () => {
  const routes = createSellerFulfillmentRoutes({ sessions: { async resolve() { return seller; } }, fulfillment: { async transition() { throw new Error("Database unavailable"); } } });
  const app = new Hono().basePath("/api");
  app.route("/seller", routes);

  const response = await app.request("http://localhost/api/seller/order-items/item-1/fulfillment", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=seller-token" }, body: JSON.stringify({ status: "processing" }) });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to update fulfillment" });
});
