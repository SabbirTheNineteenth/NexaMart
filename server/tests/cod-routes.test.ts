import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createCodRoutes } from "../src/modules/orders/cod.routes.js";

const id = "11111111-1111-4111-8111-111111111111";
const seller = { id, name: "Seller", email: "seller@example.com", role: "seller" as const, createdAt: "2026-09-29T00:00:00.000Z" };
const customer = { ...seller, role: "customer" as const };
const config = { token: "t".repeat(32), actorId: id, webhookSecret: "s".repeat(32), webhookUrl: "http://localhost:5678/webhook/nexamart-cod" };
function appFor(role: "seller" | "customer" | null, actions: { transition?: (input: unknown) => Promise<unknown> } = {}) {
  const routes = createCodRoutes({ sessions: { async resolve() { return role === "seller" ? seller : role === "customer" ? customer : null; } }, operations: { async transition(input: unknown) { return actions.transition?.(input) ?? { orderItemId: id, fulfillmentStatus: "delivered" }; }, async confirm() { return { orderId: id, status: "confirmed" }; }, async pendingConfirmation() { return []; }, async dispatch() { return { attempted: 0, delivered: 0 }; } } as never, config });
  const app = new Hono().basePath("/api"); app.route("/cod", routes); return app;
}

test("customer cannot perform a staff fulfillment action", async () => {
  const response = await appFor("customer").request(`http://localhost/api/cod/order-items/${id}`, { method: "PATCH", headers: { Cookie: "nexamart_session=x", "Content-Type": "application/json" }, body: JSON.stringify({ action: "delivered" }) });
  assert.equal(response.status, 403);
});

test("n8n callback requires dedicated service credential and allowlisted action", async () => {
  const app = appFor(null); const url = "http://localhost/api/cod/local/callback";
  const body = JSON.stringify({ eventId: "event_123", orderItemId: id, action: "cod.delivery_collected" });
  assert.equal((await app.request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status, 401);
  assert.equal((await app.request(url, { method: "POST", headers: { Authorization: "Bearer wrong", "Content-Type": "application/json" }, body })).status, 401);
  const response = await app.request(url, { method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ eventId: "event_123", orderItemId: id, action: "cod.payment_collected" }) });
  assert.equal(response.status, 400);
});

test("n8n callback passes scoped actor and stable event id to the service", async () => {
  let received: unknown; const app = appFor(null, { async transition(input) { received = input; return { orderItemId: id, fulfillmentStatus: "delivered", duplicate: false }; } });
  const response = await app.request("http://localhost/api/cod/local/callback", { method: "POST", headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ eventId: "event_123", orderItemId: id, action: "cod.delivery_collected" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { orderItemId: id, action: "delivered", actor: { kind: "n8n", id, externalEventId: "event_123" } });
});
