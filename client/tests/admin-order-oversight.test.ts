import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");

test("Admin COD oversight loads API order snapshots and exposes approval controls", () => {
  assert.match(dashboard, /getJSON<\{ orders: AdminOrder\[\] \}>\("\/admin\/orders", signal\)/);
  assert.match(dashboard, /<section className="admin-panel admin-order-oversight"[^>]*aria-labelledby="order-oversight-heading">/);
  assert.match(dashboard, /<h2 id="order-oversight-heading">Order approval and delivery<\/h2>/);
  assert.match(dashboard, /Awaiting Admin approval:/);
  assert.match(dashboard, /changeCodOrder\(`\/admin\/orders\/\$\{order\.id\}\/approve`/);
  assert.match(dashboard, /changeCodOrder\(`\/admin\/orders\/\$\{order\.id\}\/reject`/);
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

test("Admin order detail exposes per-line delivery and explicit collection controls", () => {
  assert.match(dashboard, /<details className="admin-order-detail">/);
  assert.match(dashboard, /aria-label=\{`Show order-line details for \$\{order\.reference\}`\}/);
  assert.match(dashboard, /nextCodDeliveryActions\(item\.fulfillmentStatus\)/);
  assert.match(dashboard, /item\.fulfillmentStatus === "delivered" && !item\.collectionRecorded/);
  assert.match(dashboard, /Record COD collection/);
});

test("admin order types preserve the safe immutable server snapshot", () => {
  assert.match(adminTypes, /export type AdminOrderItem = \{/);
  assert.match(adminTypes, /seller: \{ id: string \| null; name: string \| null \};/);
  assert.match(adminTypes, /product: \{ id: string \| null; name: string; imageUrl: string \| null \};/);
  assert.match(adminTypes, /variant\?: \{ sku: string; options: Record<string, string> \};/);
  assert.match(adminTypes, /fulfillmentStatus: CustomerFulfillmentStatus;/);
  assert.match(adminTypes, /items: AdminOrderItem\[\];/);
});

test("Admin COD panel never offers online payment or payout actions", () => {
  const panel = dashboard.slice(dashboard.indexOf('className="admin-panel admin-order-oversight"'), dashboard.indexOf('className="admin-panel admin-accounts"'));
  assert.doesNotMatch(panel, /(?:Stripe|bKash|SSLCommerz|Refund|Mark paid)/i);
});
