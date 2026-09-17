import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("UI-04 admin workspace uses the compact Obsidian Orchid control-room system", () => {
  assert.match(dashboard, /import "\.\/AdminDashboard\.module\.css";/);
  assert.match(dashboard, /className="admin-workspace"/);
  assert.match(dashboard, /className="admin-metrics"/);
  assert.match(styles, /:global\(\.admin-workspace\)\{[\s\S]*--admin-obsidian:#15111b/);
  assert.match(styles, /--admin-plum:#24172e/);
  assert.match(styles, /--admin-orchid:#c58cff/);
  assert.match(styles, /:global\(\.admin-metrics\)\{[\s\S]*background:var\(--admin-surface-raised\)/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(\.admin-sidebar\)\{[\s\S]*position:sticky/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(\.admin-panel\)\{[\s\S]*border:1px solid var\(--admin-line\)/);
  assert.match(styles, /:global\(:focus-visible\)\{[\s\S]*outline:3px solid/);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*:global\(\.admin-workspace\)\{[\s\S]*grid-template-columns:1fr/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});
