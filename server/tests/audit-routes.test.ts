import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createAuditRoutes } from "../src/modules/audit/audit.routes.js";

const admin = { id: "admin-1", name: "Ada", email: "admin@example.com", role: "admin" as const, createdAt: "2026-09-11T00:00:00.000Z" };
const seller = { ...admin, id: "seller-1", role: "seller" as const };
const record = { id: "audit-1", actorId: admin.id, action: "review.visibility_changed", resourceType: "product_review", resourceId: "review-1", metadata: { isVisible: false }, createdAt: new Date("2026-09-12T00:00:00.000Z") };

function makeApp(account = admin, expectedFilters: unknown = { limit: 100 }, auditReader = { async list(filters: unknown) { assert.deepEqual(filters, expectedFilters); return [record]; } }) {
  const routes = createAuditRoutes({
    sessions: { async resolve() { return account; } },
    audit: auditReader,
  });
  const app = new Hono().basePath("/api");
  app.route("/admin/audit-records", routes);
  return app;
}

test("audit record reads are restricted to authenticated admins", async () => {
  const response = await makeApp().request("http://localhost/api/admin/audit-records", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { records: [{ ...record, createdAt: record.createdAt.toISOString() }] });
});

test("audit record reads pass validated action, resource type, and bounded limit filters", async () => {
  const response = await makeApp(admin, { action: "review.visibility_changed", resourceType: "product_review", limit: 25 })
    .request("http://localhost/api/admin/audit-records?action=review.visibility_changed&resourceType=product_review&limit=25", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 200);
});

test("audit record reads reject invalid, unknown, and excessive query filters", async () => {
  for (const query of ["limit=0", "limit=101", "limit=1.5", "action=", "resourceType=", "unexpected=value"]) {
    const response = await makeApp().request(`http://localhost/api/admin/audit-records?${query}`, { headers: { Cookie: "nexamart_session=admin-token" } });
    assert.equal(response.status, 400, query);
  }
});

test("audit record reads return a generic JSON 500 when audit retrieval fails", async () => {
  const response = await makeApp(admin, { limit: 100 }, { async list() { throw new Error("postgres://db.internal:5432/audit_records"); } })
    .request("http://localhost/api/admin/audit-records", { headers: { Cookie: "nexamart_session=admin-token" } });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Unable to load audit records" });
});

test("audit record reads reject non-admin accounts", async () => {
  const response = await makeApp(seller).request("http://localhost/api/admin/audit-records", { headers: { Cookie: "nexamart_session=seller-token" } });

  assert.equal(response.status, 403);
});
