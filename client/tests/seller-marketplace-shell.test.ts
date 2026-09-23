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
  assert.match(dashboard, /activeSection === "overview" && <>\s*<div className=\{styles\.priorityGrid\}/);
  assert.match(dashboard, /className=\{styles\.inventorySignal\}/);
});

test("seller operations shell has Obsidian Orchid emphasis, compact readable rails, and mobile-safe styling", () => {
  assert.match(styles, /--seller-canvas:\s*#f7f4fb;[\s\S]*?--seller-muted:\s*#665b70/);
  assert.match(styles, /\.operationsHeader\s*\{[^}]*min-height:\s*64px/);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.sellerSidebar\s*\{[^}]*position:\s*relative[\s\S]*?\.sellerNavigation\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto/);
  assert.match(styles, /\.inventorySignal\s*\{[^}]*background:/);
  assert.match(styles, /@media\s*\(max-width:\s*700px\)\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*420px\)\s*\{/);
});
