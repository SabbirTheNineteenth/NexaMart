import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAdminOrderRoutes } from "../src/modules/admin/admin-order.routes.js";
import { CodOperationError } from "../src/modules/orders/services/cod-operations-service.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const lineId = "22222222-2222-4222-8222-222222222222";
const admin = { id: "33333333-3333-4333-8333-333333333333", name: "Admin", email: "admin@example.test", role: "admin" as const, createdAt: "2026-09-30T00:00:00.000Z" };
const customer = { ...admin, role: "customer" as const };
const headers = { Cookie: "nexamart_session=local-test", "Content-Type": "application/json" };
function setup(role: "admin" | "customer" | null = "admin") {
  const calls: { method: string; input: unknown }[] = [];
  const routes = createAdminOrderRoutes({
    sessions: { async resolve() { return role === "admin" ? admin : role === "customer" ? customer : null; } },
    orders: { async list() { return [{ id: orderId, reference: "NX-TEST", createdAt: admin.createdAt, status: "pending" as const, paymentStatus: "unpaid" as const, total: 20, customer: { id: customer.id, name: "Customer" }, items: [] }]; } },
    operations: {
      async confirm(input) { calls.push({ method: "approve", input }); return { orderId, status: "confirmed" as const }; },
      async reject(input) { calls.push({ method: "reject", input }); return { orderId, status: "cancelled" as const }; },
      async transition(input) { calls.push({ method: "delivery", input }); if (input.action === "shipped") throw new CodOperationError("INVALID_TRANSITION", "Invalid fulfillment transition"); return { orderId, orderItemId: lineId, fulfillmentStatus: input.action, duplicate: false }; },
    },
  });
  const app = new Hono().basePath("/api"); app.route("/admin/orders", routes);
  return { app, calls };
}

test("pending COD orders enter the Admin approval queue", async () => {
  const { app } = setup(); const response = await app.request("http://localhost/api/admin/orders/approval-queue", { headers });
  assert.equal(response.status, 200); assert.equal((await response.json()).orders[0].status, "pending");
});

test("Admin approval and rejection carry the authenticated actor and validated note", async () => {
  const { app, calls } = setup();
  assert.equal((await app.request(`http://localhost/api/admin/orders/${orderId}/approve`, { method: "POST", headers })).status, 200);
  assert.equal((await app.request(`http://localhost/api/admin/orders/${orderId}/reject`, { method: "POST", headers, body: JSON.stringify({ note: "Address unserviceable" }) })).status, 200);
  assert.deepEqual(calls, [{ method: "approve", input: { orderId, actorId: admin.id } }, { method: "reject", input: { orderId, actorId: admin.id, note: "Address unserviceable" } }]);
});

test("customer and anonymous sessions cannot approve, reject, or update delivery", async () => {
  for (const role of ["customer", null] as const) {
    const { app, calls } = setup(role);
    for (const [path, method, body] of [[`${orderId}/approve`, "POST", undefined], [`${orderId}/reject`, "POST", "{}"], [`${orderId}/items/${lineId}/delivery`, "PATCH", '{"action":"processing"}']] as const) {
      const response = await app.request(`http://localhost/api/admin/orders/${path}`, { method, headers, body });
      assert.equal(response.status, role === null ? 401 : 403);
    }
    assert.equal(calls.length, 0);
  }
});

test("delivery update validates payload and rejects invalid lifecycle without collection", async () => {
  const { app, calls } = setup(); const url = `http://localhost/api/admin/orders/${orderId}/items/${lineId}/delivery`;
  assert.equal((await app.request(url, { method: "PATCH", headers, body: '{"action":"collected"}' })).status, 400);
  assert.equal((await app.request(url, { method: "PATCH", headers, body: '{"action":"shipped"}' })).status, 409);
  assert.equal((await app.request(url, { method: "PATCH", headers, body: '{"action":"processing"}' })).status, 200);
  assert.deepEqual(calls.at(-1), { method: "delivery", input: { orderId, orderItemId: lineId, action: "processing", actor: { kind: "admin", id: admin.id } } });
});
