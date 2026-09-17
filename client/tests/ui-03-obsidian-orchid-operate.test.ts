import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/app/seller/[section]/page.tsx", import.meta.url), "utf8");

test("UI-03 makes every seller navigation destination an addressable Obsidian Orchid operate workspace", () => {
  assert.match(route, /"notifications"/);
  assert.match(dashboard, /seller-shell seller-workspace orchid-shell orchid-shell--operate/);
  assert.match(styles, /--seller-panel:var\(--orchid-surface\);--seller-muted:var\(--orchid-muted\)/);
  assert.match(styles, /var\(--orchid-obsidian\)!important/);
  assert.doesNotMatch(styles, /#b7e236|#eff8ce|#edf2e6|#d9ddd4/i);
});

test("UI-03 retains compact mobile navigation and reduced-motion protection", () => {
  assert.match(styles, /@media\(max-width:900px\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(dashboard, /role="alert"/);
  assert.match(dashboard, /ConfirmationDialog/);
});
