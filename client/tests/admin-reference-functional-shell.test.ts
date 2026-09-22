import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");

test("admin operations navigation reaches every supported governance and oversight workflow", () => {
  const navigation = dashboard.slice(dashboard.indexOf('<nav className="admin-workspace-nav"'), dashboard.indexOf("</nav>", dashboard.indexOf('<nav className="admin-workspace-nav"')));

  assert.match(navigation, /href=\{`\/admin\/\$\{item\.section\}`\}/);
  assert.match(navigation, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(navigation, /<AdminNavIcon Icon=\{item\.icon\} \/>/);
  for (const section of ["overview", "orders", "feedback", "finance", "analytics", "audit", "sellers", "products", "taxonomy", "promotions", "accounts"]) assert.match(dashboard, new RegExp(`section: "${section}"`));

  for (const heading of [
    "seller-moderation-heading",
    "product-oversight-heading",
    "reviews",
    "orders",
    "promotion-oversight-heading",
    "finance-heading",
    "analytics-heading",
    "accounts-heading",
    "audit-heading",
  ]) assert.match(dashboard, new RegExp(`id="${heading}"`));
  assert.match(taxonomy, /id="taxonomy-heading"/);
});

test("admin operations shell identifies its bounded read-only oversight sections", () => {
  for (const label of [
    "Read-only catalog records",
    "Review records only. Approval does not execute, transfer, or settle money.",
    "Read-only aggregate records.",
    "Read-only promotion records",
    "Read-only order snapshots.",
    "Read-only account directory.",
  ]) assert.match(dashboard, new RegExp(label.replaceAll(".", "\\.")));

  const financePanel = dashboard.slice(dashboard.indexOf('className="admin-panel admin-finance"'), dashboard.indexOf('className="admin-panel admin-analytics"'));
  assert.match(financePanel, /Approve review/);
  assert.match(financePanel, /Reject review/);
  assert.doesNotMatch(financePanel, /(?:execute|transfer|settle)\s+(?:a\s+)?payout/i);
  assert.doesNotMatch(dashboard, /(?:payment|delivery)[^\n]*<button/i);
});
