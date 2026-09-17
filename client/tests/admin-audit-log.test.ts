import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditMetadataText, auditRecordsPath } from "../src/features/admin/audit-log.utils";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("audit record paths include only supplied, trimmed filters", () => {
  assert.equal(auditRecordsPath({}), "/admin/audit-records");
  assert.equal(auditRecordsPath({ action: " product.publish ", resourceType: "", limit: "" }), "/admin/audit-records?action=product.publish");
  assert.equal(auditRecordsPath({ action: "review.hide", resourceType: "review", limit: "50" }), "/admin/audit-records?action=review.hide&resourceType=review&limit=50");
  assert.equal(auditRecordsPath({ action: "a&b", resourceType: "seller/profile", limit: "100" }), "/admin/audit-records?action=a%26b&resourceType=seller%2Fprofile&limit=100");
});

test("audit log provides accessible filtering controls and retryable states", () => {
  assert.match(dashboard, /<h2 id="audit-heading">Audit trail<\/h2>/);
  assert.match(dashboard, /<label htmlFor="audit-action">Action<\/label>/);
  assert.match(dashboard, /<input id="audit-action"[^>]*type="text"/);
  assert.match(dashboard, /<label htmlFor="audit-resource-type">Resource type<\/label>/);
  assert.match(dashboard, /<input id="audit-resource-type"[^>]*type="text"/);
  assert.match(dashboard, /<label htmlFor="audit-limit">Limit<\/label>/);
  assert.match(dashboard, /<select id="audit-limit"[^>]*value=\{auditLimit\}/);
  assert.match(dashboard, /<option value="1">1<\/option>/);
  assert.match(dashboard, /<option value="100">100<\/option>/);
  assert.match(dashboard, /<button type="submit">Apply filters<\/button>/);
  assert.match(dashboard, /<button type="button" onClick=\{resetAuditFilters\}>Reset<\/button>/);
  assert.match(dashboard, /Loading audit records…/);
  assert.match(dashboard, /Unable to load audit records\./);
  assert.match(dashboard, /className="admin-audit-retry"/);
  assert.match(dashboard, /Try again/);
  assert.match(dashboard, /No audit records match the selected filters\./);
  assert.match(dashboard, /<code>\{auditMetadataText\(record\.metadata\)\}<\/code>/);
  assert.doesNotMatch(dashboard, /dangerouslySetInnerHTML/);
});

test("audit log ignores late Apply, Reset, and Retry request A results after request B settles", () => {
  assert.match(dashboard, /export function createAuditRequestTracker\(\)[\s\S]*let latestRequestId = 0;/);
  assert.match(dashboard, /start: \(\) => \+\+latestRequestId/);
  assert.match(dashboard, /isCurrent: \(requestId: number\) => requestId === latestRequestId/);
});

test("audit log serializes metadata for text-only rendering", () => {
  assert.equal(
    auditMetadataText({ changed: true, note: "<img src=x onerror=alert(1)>" }),
    '{"changed":true,"note":"<img src=x onerror=alert(1)>"}',
  );
  assert.equal(auditMetadataText({}), "{}");
});
