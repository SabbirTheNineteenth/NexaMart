import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("ADMIN-TRUTH-01 keeps administration status and product guidance truthful", () => {
  assert.match(dashboard, /<small>Protected workspace<\/small>/);
  assert.doesNotMatch(dashboard, /aria-label="Workspace online"/);

  assert.match(dashboard, /label: "Seller catalog guidance", description: "Review the seller-owned submission workflow\.", href: "\/admin\/products\/add"/);
  assert.match(dashboard, /className="admin-product-tools-grid"/);
  assert.match(dashboard, /<h2 id="product-intake-heading">Seller catalog guidance<\/h2>/);
  assert.match(dashboard, /Products remain seller-owned\. This administration workspace governs taxonomy, moderation, and publication rather than creating inventory under an administrator account\./);
  assert.match(dashboard, /label: "Add product", href: "\/admin\/products\/add"/);
  assert.match(dashboard, /description: "Open seller catalog guidance"/);
});
