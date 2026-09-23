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

  assert.match(stylesheet, /\.sellerNavigation a\s*\{[^}]*font-size:\s*13px/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.sellerNavigation\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto[\s\S]*?\.sellerNavigation a\s*\{[^}]*flex:\s*0 0 auto/);
  assert.doesNotMatch(stylesheet, /\.sellerNavigation a\s*\{[^}]*font-size:\s*0/);
});

test("seller operate uses an honest context-specific command rather than a static fake action", () => {
  assert.match(dashboard, /const commandTarget = activeSection === "catalog" \? "inventory" : "catalog";/);
  assert.match(dashboard, /href=\{productCreationOnly \? "\/seller\/catalog" : `\/seller\/\$\{commandTarget\}`\}/);
  assert.match(dashboard, /productCreationOnly \? "Back to catalog" : activeSection === "catalog" \? "Manage inventory" : "Manage catalog"/);
});
