import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");

test("admin orders oversight loads safe immutable order snapshots from the dedicated endpoint", () => {
  assert.match(dashboard, /getJSON<\{ orders: AdminOrder\[\] \}>\("\/admin\/orders", signal\)/);
  assert.match(dashboard, /<section className="admin-panel admin-order-oversight"[^>]*aria-labelledby="order-oversight-heading">/);
  assert.match(dashboard, /<h2 id="order-oversight-heading">Order oversight<\/h2>/);
  assert.match(dashboard, /Read-only order snapshots\. Payment and delivery changes are not available here\./);
  assert.match(dashboard, /data\.orders\.map\(\(order\)/);
  assert.match(dashboard, /order\.reference/);
  assert.match(dashboard, /order\.customer\.name/);
  assert.match(dashboard, /order\.paymentStatus/);
  assert.match(dashboard, /timestampFormat\.format\(new Date\(order\.createdAt\)\)/);
  assert.match(dashboard, /order\.items\.map\(\(item\)/);
  assert.match(dashboard, /item\.seller\.name \?\? "Unassigned"/);
  assert.match(dashboard, /item\.product\.name/);
  assert.match(dashboard, /item\.variant\?\.sku/);
  assert.match(dashboard, /Object\.entries\(item\.variant\.options\)/);
  assert.match(dashboard, /item\.quantity/);
  assert.match(dashboard, /item\.unitPrice/);
  assert.match(dashboard, /item\.fulfillmentStatus/);
});

test("admin orders oversight communicates loading, retryable errors, and empty records", () => {
  assert.match(dashboard, /Loading order records…/);
  assert.match(dashboard, /Unable to load order records\./);
  assert.match(dashboard, /onClick=\{\(\) => void loadOrders\(\)\}/);
  assert.match(dashboard, /No orders are available for oversight\./);
  assert.match(dashboard, /aria-label="Retry loading order records"/);
});

test("admin order oversight has an accessible detail control without order mutation controls", () => {
  assert.match(dashboard, /<details className="admin-order-detail">/);
  assert.match(dashboard, /aria-label=\{`Show order-line details for \$\{order\.reference\}`\}/);
});

test("admin order types preserve the safe immutable server snapshot", () => {
  assert.match(adminTypes, /export type AdminOrderItem = \{/);
  assert.match(adminTypes, /seller: \{ id: string \| null; name: string \| null \};/);
  assert.match(adminTypes, /product: \{ id: string \| null; name: string; imageUrl: string \| null \};/);
  assert.match(adminTypes, /variant\?: \{ sku: string; options: Record<string, string> \};/);
  assert.match(adminTypes, /fulfillmentStatus: FulfillmentStatus;/);
  assert.match(adminTypes, /items: AdminOrderItem\[\];/);
});

test("admin order oversight exposes no order, payment, or delivery mutation controls", () => {
  const start = dashboard.indexOf('className="admin-panel admin-order-oversight"');
  const end = dashboard.indexOf('className="admin-panel admin-accounts"', start);
  const panel = dashboard.slice(start, end);
  assert.doesNotMatch(panel, /<button[^>]*>(?:Approve|Cancel|Refund|Ship|Deliver|Mark paid)/i);
  assert.doesNotMatch(panel, /patchJSON\([^)]*(?:orders|payment|delivery)/i);
  assert.doesNotMatch(panel, /postJSON\([^)]*(?:orders|payment|delivery)/i);
  assert.doesNotMatch(panel, /deleteJSON\([^)]*(?:orders|payment|delivery)/i);
});
