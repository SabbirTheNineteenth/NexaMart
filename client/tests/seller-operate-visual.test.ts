import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller operate keeps landmarked commands and readable section names at every width", () => {
  assert.match(dashboard, /aria-label="NexaMart seller operations"/);
  assert.match(dashboard, /data-seller-rail="persistent"/);
  assert.match(dashboard, /aria-label="Seller workspace command"/);
  assert.match(dashboard, /aria-label="Seller sections"/);

  assert.match(stylesheet, /\.sellerNavigation a\{[\s\S]*?font-size:11px/);
  assert.match(stylesheet, /@media\(max-width:900px\)\{[\s\S]*?\.sellerNavigation\{display:flex;[\s\S]*?overflow-x:auto[\s\S]*?\.sellerNavigation a\{flex:0 0 auto/);
  assert.doesNotMatch(stylesheet, /\.sellerNavigation a\{[^}]*font-size:0/);
});

test("seller operate uses an honest context-specific command rather than a static fake action", () => {
  assert.match(dashboard, /const commandTarget = activeSection === "catalog" \? "inventory" : "catalog";/);
  assert.match(dashboard, /href=\{`\/seller\/\$\{commandTarget\}`\}/);
  assert.match(dashboard, /\{activeSection === "catalog" \? "Manage inventory" : "Manage catalog"\}/);
});
