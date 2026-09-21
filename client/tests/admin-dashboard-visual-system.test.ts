import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("UI-04 admin workspace uses the compact Obsidian Orchid control-room system", () => {
  assert.match(dashboard, /import "\.\/AdminDashboard\.module\.css";/);
  assert.match(dashboard, /className="admin-workspace"/);
  assert.match(dashboard, /className="admin-overview-command-deck"/);
  assert.match(styles, /:global\(\.admin-workspace\)\{[\s\S]*--admin-obsidian:#15111b/);
  assert.match(styles, /--admin-plum:#24172e/);
  assert.match(styles, /--admin-orchid:#c58cff/);
  assert.match(styles, /:global\(\.admin-overview-command-deck\)\{[\s\S]*background:var\(--admin-surface\)/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(\.admin-sidebar\)\{[\s\S]*position:sticky/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(\.admin-panel\)\{[\s\S]*border:1px solid var\(--admin-line\)/);
  assert.match(styles, /:global\(:focus-visible\)\{[\s\S]*outline:3px solid/);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*:global\(\.admin-workspace\)\{[\s\S]*grid-template-columns:1fr/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});

test("UI-05 overview distinguishes actionable queues from activity and keeps controls operable on narrow screens", () => {
  assert.match(dashboard, /aria-label="Governance queues"/);
  assert.match(dashboard, /<article><span>Admin Audit<\/span>[\s\S]*?recent records/);
  assert.match(dashboard, /href="\/admin\/products">Open product oversight/);
  assert.match(dashboard, /href="\/admin\/applications">View all/);
  assert.match(styles, /:global\(\.admin-action-control\)\{[\s\S]*min-height:44px/);
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:1fr/);
  assert.match(styles, /:global\(\.admin-workspace\)\{[\s\S]*overflow-x:clip/);
});
