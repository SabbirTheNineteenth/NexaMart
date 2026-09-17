import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createSellerPromotionRoutes } from "../src/modules/promotions/seller-promotion.routes.js";

const seller = { id: "seller-1", name: "Sabbir", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const promotion = { name: "Autumn launch", scope: "product" as const, productId: "11111111-1111-4111-8111-111111111111", discountPercent: 15, startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-10-31T23:59:59.000Z" };

test("seller promotion creation derives ownership from the opaque session", async () => {
  let received: unknown;
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: { async create(input: unknown) { received = input; return { id: "promotion-1", ...input as object }; }, async list() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" },
    body: JSON.stringify({ sellerId: "attacker", ...promotion }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(received, { sellerId: seller.id, ...promotion, startsAt: new Date(promotion.startsAt), endsAt: new Date(promotion.endsAt) });
});

test("seller promotion listing derives ownership from the opaque session", async () => {
  let requestedSellerId = "";
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: { async create() { throw new Error("not used"); }, async list(sellerId: string) { requestedSellerId = sellerId; return [{ id: "promotion-1" }]; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions", { headers: { Cookie: "nexamart_session=opaque-session-token" } });

  assert.equal(response.status, 200);
  assert.equal(requestedSellerId, seller.id);
  assert.deepEqual(await response.json(), { promotions: [{ id: "promotion-1" }] });
});

test("seller promotion listing returns a generic JSON failure without persistence details", async () => {
  const persistenceMessage = "PostgresError: connection refused postgres://internal-db";
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: { async create() { throw new Error("not used"); }, async list() { throw new Error(persistenceMessage); } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions", { headers: { Cookie: "nexamart_session=opaque-session-token" } });

  const responseText = await response.clone().text();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load seller promotions" });
  assert.equal(responseText.includes(persistenceMessage), false);
});

test("seller promotion routes reject non-seller accounts", async () => {
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return { ...seller, role: "customer" as const }; } },
    promotions: { async create() { throw new Error("not used"); }, async list() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  assert.equal((await app.request("http://localhost/api/seller/promotions", { headers: { Cookie: "nexamart_session=opaque-session-token" } })).status, 403);
});

test("seller promotion creation hides products the seller does not own", async () => {
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: { async create() { throw new Error("Product not found"); }, async list() { return []; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" },
    body: JSON.stringify(promotion),
  });

  assert.equal(response.status, 404);
});

test("seller promotion updates only safe configuration fields for the session seller", async () => {
  let received: unknown;
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: {
      async create() { throw new Error("not used"); },
      async list() { return []; },
      async update(input: unknown) { received = input; return { id: "promotion-1", ...input as object }; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/11111111-1111-4111-8111-111111111111", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" },
    body: JSON.stringify({ name: "Winter launch", discountPercent: 20, startsAt: "2026-11-01T00:00:00.000Z", endsAt: "2026-11-30T23:59:59.000Z" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    sellerId: seller.id,
    promotionId: "11111111-1111-4111-8111-111111111111",
    name: "Winter launch",
    discountPercent: 20,
    startsAt: new Date("2026-11-01T00:00:00.000Z"),
    endsAt: new Date("2026-11-30T23:59:59.000Z"),
  });
});

test("seller promotion updates reject ownership, status, product reassignment, unknown fields, empty payloads, invalid percentages, and invalid date ranges", async () => {
  let updateCalls = 0;
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: {
      async create() { throw new Error("not used"); },
      async list() { return []; },
      async update() { updateCalls += 1; throw new Error("not used"); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);
  const headers = { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" };

  for (const body of [
    { sellerId: "attacker", name: "Winter launch" },
    { status: "active" },
    { productId: "11111111-1111-4111-8111-111111111111" },
    { scope: "order" },
    { unexpected: true },
    {},
    { discountPercent: 0 },
    { startsAt: "2026-12-31T00:00:00.000Z", endsAt: "2026-12-01T00:00:00.000Z" },
  ]) {
    const response = await app.request("http://localhost/api/seller/promotions/promotion-1", { method: "PATCH", headers, body: JSON.stringify(body) });
    assert.equal(response.status, 400);
  }
  assert.equal(updateCalls, 0);
});

test("seller promotion updates reject non-UUID identifiers without invoking the service", async () => {
  let updateCalls = 0;
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: {
      async create() { throw new Error("not used"); },
      async list() { return []; },
      async update() { updateCalls += 1; throw new Error("not used"); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/not-a-uuid", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" },
    body: JSON.stringify({ name: "Winter launch" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid promotion id" });
  assert.equal(updateCalls, 0);
});

test("seller promotion updates conceal missing or unowned promotions", async () => {
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: {
      async create() { throw new Error("not used"); },
      async list() { return []; },
      async update() { throw new Error("Promotion not found"); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/22222222-2222-4222-8222-222222222222", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" },
    body: JSON.stringify({ name: "Winter launch" }),
  });

  assert.equal(response.status, 404);
});

test("seller promotion updates return 400 for a date range made invalid by a partial edit", async () => {
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: {
      async create() { throw new Error("not used"); },
      async list() { return []; },
      async update() { throw new Error("Promotion must end after it starts"); },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/11111111-1111-4111-8111-111111111111", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" },
    body: JSON.stringify({ startsAt: "2026-12-01T00:00:00.000Z" }),
  });

  assert.equal(response.status, 400);
});

test("seller promotion deletion derives ownership from the opaque session", async () => {
  let received: unknown;
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: {
      async create() { throw new Error("not used"); },
      async list() { return []; },
      async update() { throw new Error("not used"); },
      async delete(input: unknown) { received = input; },
    },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/11111111-1111-4111-8111-111111111111", {
    method: "DELETE",
    headers: { Cookie: "nexamart_session=opaque-session-token" },
  });

  assert.equal(response.status, 204);
  assert.deepEqual(received, { sellerId: seller.id, promotionId: "11111111-1111-4111-8111-111111111111" });
});

test("seller promotion deletion requires authentication and seller role", async () => {
  const unauthorizedRoutes = createSellerPromotionRoutes({
    sessions: { async resolve() { return null; } },
    promotions: { async create() { throw new Error("not used"); }, async list() { return []; }, async update() { throw new Error("not used"); }, async delete() { throw new Error("not used"); } },
  });
  const forbiddenRoutes = createSellerPromotionRoutes({
    sessions: { async resolve() { return { ...seller, role: "customer" as const }; } },
    promotions: { async create() { throw new Error("not used"); }, async list() { return []; }, async update() { throw new Error("not used"); }, async delete() { throw new Error("not used"); } },
  });
  const unauthorizedApp = new Hono().basePath("/api");
  const forbiddenApp = new Hono().basePath("/api");
  unauthorizedApp.route("/seller/promotions", unauthorizedRoutes);
  forbiddenApp.route("/seller/promotions", forbiddenRoutes);
  const url = "http://localhost/api/seller/promotions/11111111-1111-4111-8111-111111111111";

  assert.equal((await unauthorizedApp.request(url, { method: "DELETE" })).status, 401);
  assert.equal((await forbiddenApp.request(url, { method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session-token" } })).status, 403);
});

test("seller promotion deletion rejects non-UUID identifiers without invoking the service", async () => {
  let deleteCalls = 0;
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: { async create() { throw new Error("not used"); }, async list() { return []; }, async update() { throw new Error("not used"); }, async delete() { deleteCalls += 1; } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/not-a-uuid", { method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session-token" } });

  assert.equal(response.status, 400);
  assert.equal(deleteCalls, 0);
});

test("seller promotion deletion conceals missing or unowned promotions", async () => {
  const routes = createSellerPromotionRoutes({
    sessions: { async resolve() { return seller; } },
    promotions: { async create() { throw new Error("not used"); }, async list() { return []; }, async update() { throw new Error("not used"); }, async delete() { throw new Error("Promotion not found"); } },
  });
  const app = new Hono().basePath("/api");
  app.route("/seller/promotions", routes);

  const response = await app.request("http://localhost/api/seller/promotions/22222222-2222-4222-8222-222222222222", { method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session-token" } });

  assert.equal(response.status, 404);
});

test("seller promotion writes expose only known product, date, and ownership domain failures", async () => {
  const createCases = [
    ["Product not found", { status: 404, error: "Product not found" }],
    ["PostgresError: insert into promotions violated database policy", { status: 500, error: "Unable to create promotion" }],
  ];
  for (const [message, expected] of createCases) {
    const routes = createSellerPromotionRoutes({
      sessions: { async resolve() { return seller; } },
      promotions: { async create() { throw new Error(message); }, async list() { return []; }, async update() { throw new Error("not used"); }, async delete() { throw new Error("not used"); } },
    });
    const app = new Hono().basePath("/api");
    app.route("/seller/promotions", routes);
    const response = await app.request("http://localhost/api/seller/promotions", { method: "POST", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" }, body: JSON.stringify(promotion) });
    assert.equal(response.status, expected.status);
    assert.deepEqual(await response.json(), { error: expected.error });
  }

  const updateCases = [
    ["Promotion must end after it starts", { status: 400, error: "Promotion must end after it starts" }],
    ["Promotion schedule overlaps an existing promotion", { status: 409, error: "Promotion schedule overlaps an existing promotion" }],
    ["Promotion not found", { status: 404, error: "Promotion not found" }],
    ["ECONNRESET postgres://internal-db", { status: 500, error: "Unable to update promotion" }],
  ];
  for (const [message, expected] of updateCases) {
    const routes = createSellerPromotionRoutes({
      sessions: { async resolve() { return seller; } },
      promotions: { async create() { throw new Error("not used"); }, async list() { return []; }, async update() { throw new Error(message); }, async delete() { throw new Error("not used"); } },
    });
    const app = new Hono().basePath("/api");
    app.route("/seller/promotions", routes);
    const response = await app.request("http://localhost/api/seller/promotions/11111111-1111-4111-8111-111111111111", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: "nexamart_session=opaque-session-token" }, body: JSON.stringify({ name: "Winter launch" }) });
    assert.equal(response.status, expected.status);
    assert.deepEqual(await response.json(), { error: expected.error });
  }
});

test("seller promotion deletion conceals only known ownership failures", async () => {
  for (const [message, expected] of [
    ["Promotion not found", { status: 404, error: "Promotion not found" }],
    ["PostgresError: connection refused", { status: 500, error: "Unable to delete promotion" }],
  ]) {
    const routes = createSellerPromotionRoutes({
      sessions: { async resolve() { return seller; } },
      promotions: { async create() { throw new Error("not used"); }, async list() { return []; }, async update() { throw new Error("not used"); }, async delete() { throw new Error(message); } },
    });
    const app = new Hono().basePath("/api");
    app.route("/seller/promotions", routes);
    const response = await app.request("http://localhost/api/seller/promotions/11111111-1111-4111-8111-111111111111", { method: "DELETE", headers: { Cookie: "nexamart_session=opaque-session-token" } });
    assert.equal(response.status, expected.status);
    assert.deepEqual(await response.json(), { error: expected.error });
  }
});
