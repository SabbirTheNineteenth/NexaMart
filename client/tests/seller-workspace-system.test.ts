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
  assert.match(styles, /\.workspace\s*\{/);
  assert.match(styles, /\.operationsHeader\s*\{/);
  assert.match(styles, /\.catalogFilters,\.inventoryFilters\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[^}]*\.workspace\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(styles, /@media\s*\(max-width:\s*700px\)[^}]*\.sellerContent\s*\{[^}]*padding:\s*0 16px 34px/);
  assert.match(dashboard, /aria-label=\{`Update \$\{item\.productName\} fulfillment status`\}/);
  assert.match(dashboard, /aria-label=\{`Update stock for \$\{product\.name\}`\}/);
});

test("VISUAL-SELLER-01 keeps the Operate command rail, context row, dense panels, and mobile rail contract", () => {
  assert.match(dashboard, /<aside className=\{styles\.sellerSidebar\} data-seller-rail="persistent"/);
  assert.match(dashboard, /styles\.commandBar/);
  assert.match(dashboard, /styles\.sectionContext/);
  assert.match(dashboard, /<div className=\{styles\.activeWorkspace\}>/);
  assert.match(styles, /\.sellerSidebar\s*\{[^}]*position:\s*sticky;[^}]*height:\s*100dvh/);
  assert.match(styles, /\.commandBar\s*\{[^}]*position:\s*sticky/);
  assert.match(styles, /\.activeWorkspace\s*\{[^}]*display:\s*grid;[^}]*gap:\s*18px;[^}]*padding-top:\s*22px/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.sellerSidebar\s*\{[^}]*position:\s*relative[\s\S]*?\.sellerNavigation\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto/);
  assert.match(styles, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.operationsHeader\s*\{[^}]*flex-direction:\s*column/);
  assert.doesNotMatch(styles, /\.sellerNavigation a\s*\{[^}]*font-size:\s*0/);
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
