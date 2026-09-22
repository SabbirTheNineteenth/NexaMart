import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

test("ADMIN-TRUTH-01 keeps administration status and product guidance truthful", () => {
  assert.match(dashboard, /<small>Protected workspace<\/small>/);
  assert.doesNotMatch(dashboard, /aria-label="Workspace online"/);

  assert.match(dashboard, /href: "\/admin\/products\/add", label: "Seller catalog guidance"/);
  assert.match(dashboard, /href="\/admin\/products\/add"><strong>Seller catalog guidance<\/strong><span>Open guidance for the seller-owned catalog workflow\.<\/span><\/Link>/);
  assert.match(dashboard, /<h2 id="product-intake-heading">Seller catalog guidance<\/h2>/);
  assert.match(dashboard, /Products remain seller-owned\. This administration workspace governs taxonomy, moderation, and publication rather than creating inventory under an administrator account\./);
  assert.doesNotMatch(dashboard, /label: "Add product"/);
});
