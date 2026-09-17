import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller workspace uses a dedicated compact marketplace operations shell", () => {
  assert.match(dashboard, /import styles from "\.\/SellerDashboard\.module\.css"/);
  assert.match(dashboard, /className=\{styles\.operationsHeader\}/);
  assert.match(dashboard, /aria-label="Seller sections"/);
  assert.match(dashboard, /href=\{`\/seller\/\$\{item\.section\}`\}/);
  assert.match(dashboard, /activeSection === "overview" && <div className=\{styles\.priorityGrid\}/);
  assert.match(dashboard, /className=\{styles\.inventorySignal\}/);
});

test("seller operations shell has Obsidian Orchid emphasis, compact readable rails, and mobile-safe styling", () => {
  assert.match(styles, /--seller-panel:var\(--orchid-surface\);--seller-muted:var\(--orchid-muted\)/);
  assert.match(styles, /\.operationsHeader\{/);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*\.sellerNavigation\{display:flex;[\s\S]*overflow-x:auto/);
  assert.match(styles, /\.inventorySignal\{/);
  assert.match(styles, /@media\(max-width:640px\)\{/);
  assert.match(styles, /@media\(max-width:420px\)\{/);
});
