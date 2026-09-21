import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller dashboard keeps the operational rail and topbar comfortably touchable", () => {
  assert.match(dashboard, /aria-label="Seller workspace command"/);
  assert.match(stylesheet, /\.sellerNavigation a\{[\s\S]*?min-height:44px/);
  assert.match(stylesheet, /\.topbarAction\{[\s\S]*?min-height:44px/);
  assert.match(stylesheet, /\.inventoryAttentionHead a\{[\s\S]*?min-height:44px/);
});

test("seller dashboard makes action, focus, and feedback states explicit without motion for reduced-motion users", () => {
  assert.match(stylesheet, /\.workspace :global\(\.primary-button\)[\s\S]*?:focus-visible/);
  assert.match(stylesheet, /\.workspace :global\(\.seller-profile-success\)[\s\S]*?\.workspace :global\(\.seller-error\)/);
  assert.match(stylesheet, /@media\(prefers-reduced-motion:reduce\)\{\.workspace \*\{animation:none!important;transition:none!important;scroll-behavior:auto!important\}\}/);
});

test("seller dashboard gives loading, empty, and failed work clear bounded surfaces", () => {
  assert.match(dashboard, /className=\{styles\.workspaceState\}/);
  assert.match(dashboard, /aria-busy=\{notificationsLoading\}/);
  assert.match(dashboard, /No inventory needs attention right now\./);
  assert.match(stylesheet, /\.workspaceState\{[\s\S]*?border:1px solid var\(--orchid-border\)/);
});

test("seller dashboard keeps compact controls and tables usable on narrow screens", () => {
  assert.match(stylesheet, /\.commandBar\{[\s\S]*?overflow:clip/);
  assert.match(stylesheet, /\.inventoryTableWrap\{[\s\S]*?overscroll-behavior-x:contain/);
  assert.match(stylesheet, /@media\(max-width:640px\)\{[\s\S]*?\.topbarActions\{min-width:0/);
});
