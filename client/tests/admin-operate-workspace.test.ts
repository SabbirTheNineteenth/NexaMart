import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin dashboard provides an accessible responsive operate workspace shell", () => {
  assert.match(dashboard, /<main className="admin-workspace"/);
  assert.match(dashboard, /<a className="admin-skip-link" href="#admin-workspace-content" onClick=\{focusWorkspace\}>Skip to workspace content<\/a>/);
  assert.match(dashboard, /<aside className="admin-sidebar" aria-label="Administration workspace">/);
  assert.match(dashboard, /<nav className="admin-workspace-nav" aria-label="Administration sections">/);
  assert.match(dashboard, /const adminControlRoomOrder: AdminSection\[\] = \[/);
  assert.match(dashboard, /adminControlRoomOrder\.map\(\(section\) =>/);
  assert.match(dashboard, /href=\{`\/admin\/\$\{item\.section\}`\}/);
  assert.match(dashboard, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(dashboard, /<AdminNavIcon symbol=\{item\.icon\} \/>/);
  assert.match(dashboard, /<div className="admin-workspace-content" id="admin-workspace-content" ref=\{workspaceContentRef\} tabIndex=\{-1\}>/);
  assert.match(dashboard, /<nav className="admin-breadcrumb" aria-label="Breadcrumb">/);
  assert.match(dashboard, /<section className="admin-context-header" aria-labelledby="admin-workspace-title">/);
  assert.match(styles, /\.admin-workspace\{/);
  assert.match(styles, /\.admin-sidebar\{/);
  assert.match(styles, /\.admin-skip-link\{/);
  assert.match(styles, /@media\(max-width:900px\)\{[\s\S]*\.admin-sidebar/s);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
});
