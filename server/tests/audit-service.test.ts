import assert from "node:assert/strict";
import test from "node:test";
import { AuditService } from "../src/modules/audit/services/audit-service.js";

test("audit service appends a sanitized immutable record", async () => {
  let received: unknown;
  const service = new AuditService({
    async append(input) {
      received = input;
      return { id: "audit-1", ...input, createdAt: new Date("2026-09-12T00:00:00.000Z") };
    },
    async list() { return []; },
  });

  const record = await service.record({
    actorId: "admin-1",
    action: "review.visibility_changed",
    resourceType: "product_review",
    resourceId: "review-1",
    metadata: { isVisible: false, password: "do-not-store", nested: { token: "do-not-store", kept: "value" } },
  });

  assert.deepEqual(received, {
    actorId: "admin-1",
    action: "review.visibility_changed",
    resourceType: "product_review",
    resourceId: "review-1",
    metadata: { isVisible: false, nested: { kept: "value" } },
  });
  assert.equal(record.id, "audit-1");
});

test("audit service forwards optional audit filters without changing the append-only record shape", async () => {
  let requestedFilters: unknown;
  const service = new AuditService({
    async append() { throw new Error("not used"); },
    async list(filters) { requestedFilters = filters; return []; },
  });

  assert.deepEqual(await service.list({ action: "review.visibility_changed", resourceType: "product_review", limit: 25 }), []);
  assert.deepEqual(requestedFilters, { action: "review.visibility_changed", resourceType: "product_review", limit: 25 });
});
