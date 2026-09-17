import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin promotion oversight loads the dedicated read-only promotion feed", () => {
  assert.match(dashboard, /getJSON<\{ promotions: AdminPromotion\[\] \}>\("\/admin\/promotions", signal\)/);
  assert.match(dashboard, /<section className="admin-panel admin-promotion-oversight" aria-labelledby="promotion-oversight-heading">/);
  assert.match(dashboard, /<h2 id="promotion-oversight-heading">Promotion oversight<\/h2>/);
  assert.match(dashboard, /Read-only promotion records\. Product flash offers are server-priced/);
  assert.match(dashboard, /data\.promotions\.map\(\(promotion\)/);
  assert.match(dashboard, /promotion\.scope/);
  assert.match(dashboard, /promotion\.product\.name \?\? "Selected product"/);
  assert.match(dashboard, /promotion\.seller\.name/);
  assert.match(dashboard, /promotion\.discountPercent/);
  assert.match(dashboard, /promotion\.startsAt/);
  assert.match(dashboard, /promotion\.endsAt/);
  assert.match(dashboard, /promotion\.createdAt/);
});

test("admin promotion oversight isolates loading, retryable errors, and empty records", () => {
  assert.match(dashboard, /Loading promotion configurations…/);
  assert.match(dashboard, /Unable to load promotion configurations\./);
  assert.match(dashboard, /onClick=\{\(\) => void loadPromotions\(\)\}/);
  assert.match(dashboard, /No promotion configurations are available for oversight\./);
});

test("admin promotion types retain only safe configuration and scope data", () => {
  assert.match(adminTypes, /export type AdminPromotion = \{/);
  assert.match(adminTypes, /scope: "product" \| "order";/);
  assert.match(adminTypes, /product: \{ id: string \| null; name: string \| null; imageUrl: string \| null \};/);
  assert.match(adminTypes, /seller: \{ id: string; name: string \};/);
  assert.match(adminTypes, /discountPercent: number;/);
  assert.match(adminTypes, /startsAt: string;/);
  assert.match(adminTypes, /endsAt: string;/);
  assert.match(adminTypes, /createdAt: string;/);
  assert.match(adminTypes, /promotions: AdminPromotion\[\];/);
});

test("admin promotion oversight exposes no configuration, status, payment, or delivery mutations", () => {
  const start = dashboard.indexOf('className="admin-panel admin-promotion-oversight"');
  const end = dashboard.indexOf('className="admin-panel admin-reviews"', start);
  const panel = dashboard.slice(start, end);
  assert.doesNotMatch(panel, /<button[^>]*>(?:Edit|Delete|Save|Activate|Deactivate|Approve|Pay|Deliver)/i);
  assert.doesNotMatch(panel, /(?:patch|post|delete)JSON\([^)]*(?:promotion|payment|delivery)/i);
});

test("admin promotion oversight styles collapse records for smaller screens", () => {
  assert.match(styles, /\.admin-promotion-oversight\{margin-top:28px\}/);
  assert.match(styles, /\.admin-promotion-record\{display:grid;/);
  assert.match(styles, /@media\(max-width:760px\)\{[^}]*\.admin-promotion-record\{grid-template-columns:1fr;/);
});
