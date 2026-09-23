import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller operations shell keeps the real routes grouped and gives each workspace route-aware context", () => {
  const operate = dashboard.slice(dashboard.indexOf('group: "Operate"'), dashboard.indexOf('group: "Manage"'));
  const manage = dashboard.slice(dashboard.indexOf('{ section: "catalog"'), dashboard.indexOf('const isSellerSection'));

  for (const label of ["Overview", "Fulfillment", "Notifications", "Analytics"]) assert.match(operate, new RegExp(`label: "${label}"`));
  for (const label of ["Catalog", "Inventory", "Taxonomy", "Promotions", "Store profile", "Finance", "Reviews"]) assert.match(manage, new RegExp(`label: "${label}"`));
  assert.match(dashboard, /const sellerSectionContext: Record<SellerSection, \{ eyebrow: string; description: string \}>/);
  assert.match(dashboard, /const activeContext = sellerSectionContext\[activeSection\];/);
  assert.match(dashboard, /className=\{styles\.sellerFooter\}/);
  assert.match(dashboard, /item\.section === activeSection \? styles\.activeNav : undefined/);
  assert.match(dashboard, /aria-current=\{item\.section === activeSection \? "page" : undefined\}/);
});

test("seller workspace exposes practical, truthful overview and operation recovery states without fallback business claims", () => {
  for (const message of [
    "No catalog items require attention.",
    "No fulfillment actions are currently available.",
    "Awaiting real workspace data.",
  ]) assert.match(dashboard, new RegExp(message.replace(/[.]/g, "\\.")));
  assert.match(dashboard, /No inventory needs attention right now\./);
  assert.doesNotMatch(dashboard, /(forecast|guaranteed|projected revenue|conversion rate|seller performance)/i);
});

test("seller final workspace contract uses readable pale operational surfaces, contained mobile navigation, and reduced motion", () => {
  for (const hook of [".workspace", ".sellerSidebar", ".sellerNavigation", ".sellerFooter", ".workspaceIntro", ".activeWorkspace", ".inventoryTableWrap"]) assert.ok(styles.includes(hook), `missing ${hook}`);
  assert.match(styles, /--seller-canvas:\s*#f7f4fb/);
  assert.match(styles, /\.sellerNavigation\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(styles, /\.sellerFooter\s*\{[^}]*margin:\s*auto 4px 0/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.sellerNavigation\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[^}]*\.workspace \*[^}]*animation:\s*none;\s*transition:\s*none;\s*scroll-behavior:\s*auto/);
});
