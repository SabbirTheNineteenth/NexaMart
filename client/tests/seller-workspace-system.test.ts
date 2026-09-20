import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller dashboard provides a responsive operational workspace frame while preserving fulfillment controls", () => {
  assert.match(dashboard, /seller-shell seller-workspace orchid-shell orchid-shell--operate/);
  assert.match(dashboard, /seller-topbar seller-workspace-topbar \$\{styles\.commandBar\}/);
  assert.match(dashboard, /<section className=\{styles\.workspaceIntro\} aria-labelledby="seller-workspace-heading">/);
  assert.match(dashboard, /<div className=\{styles\.activeWorkspace\}>/);
  assert.match(styles, /\.workspace\{/);
  assert.match(styles, /\.operationsHeader\{/);
  assert.match(styles, /\.catalogFilters\{/);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*\.workspace\{grid-template-columns:1fr!important/);
  assert.match(styles, /@media\(max-width:640px\)\{[\s\S]*\.sellerContent\{padding:0 15px 34px/);
  assert.match(dashboard, /aria-label=\{`Update \$\{item\.productName\} fulfillment status`\}/);
  assert.match(dashboard, /aria-label=\{`Update stock for \$\{product\.name\}`\}/);
});

test("VISUAL-SELLER-01 keeps the Operate command rail, context row, dense panels, and mobile rail contract", () => {
  assert.match(dashboard, /<aside className=\{styles\.sellerSidebar\} data-seller-rail="persistent"/);
  assert.match(dashboard, /styles\.commandBar/);
  assert.match(dashboard, /styles\.sectionContext/);
  assert.match(dashboard, /<div className=\{styles\.activeWorkspace\}>/);
  assert.match(styles, /\.sellerSidebar\{[\s\S]*?position:sticky;[\s\S]*?height:100vh/);
  assert.match(styles, /\.commandBar\{[\s\S]*?position:sticky/);
  assert.match(styles, /\.activeWorkspace\{display:grid;gap:14px;padding-top:16px/);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*?\.sellerSidebar\{position:relative[\s\S]*?\.sellerNavigation\{display:flex;[\s\S]*?overflow-x:auto/);
  assert.match(styles, /@media\(max-width:640px\)\{[\s\S]*?\.workspaceContext>span:first-child,.sectionContext\{display:none/);
  assert.doesNotMatch(styles, /\.sellerNavigation a\{[^}]*font-size:0/);
  assert.doesNotMatch(dashboard, /(carrier|tracking|payment status|payout sent|settled)/i);
});

test("seller overview frames real inventory records without inventing a notification side feed", () => {
  assert.match(dashboard, /const inventoryAttention = useMemo/);
  assert.match(dashboard, /id="seller-inventory-attention-heading"/);
  assert.match(dashboard, /Inventory attention/);
  assert.match(dashboard, /href="\/seller\/inventory"/);
  assert.match(dashboard, /product\.stock === 0/);
  assert.match(dashboard, /product\.stock > 0 && product\.stock < 6/);
  assert.doesNotMatch(dashboard, /activeSection === "overview"[\s\S]{0,2400}notifications\.map/);
});
