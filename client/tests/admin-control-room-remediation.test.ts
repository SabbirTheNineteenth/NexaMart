import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("admin control room keeps real queues actionable, stateful, and usable on narrow screens", () => {
  assert.match(dashboard, /className="admin-overview-command-deck" aria-label="Governance queues" aria-live="polite" aria-busy=/);
  assert.match(dashboard, /className="admin-queue-action" href="\/admin\/applications"/);
  assert.match(dashboard, /className="admin-queue-action" href="\/admin\/products"/);
  assert.match(dashboard, /className="admin-queue-action" href="\/admin\/finance"/);
  assert.match(dashboard, /className="admin-queue-action" href="\/admin\/audit"/);
  assert.match(dashboard, /role="region" aria-label="Recent administrative activity" tabIndex=\{0\}/);
  assert.match(styles, /:global\(\.admin-queue-action\)\{[^}]*min-height:44px/);
  assert.match(styles, /:global\(\.admin-overview-audit-table-wrap\)\{[^}]*overscroll-behavior-inline:contain/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(button:disabled\)\{[^}]*cursor:wait/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(\[aria-busy="true"\]\)\{[^}]*opacity:/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*transition-duration:\.01ms!important/);
});

test("admin control room contains its working surface and preserves usable recovery controls at 700, 420, and 390px", () => {
  assert.match(dashboard, /className="admin-sidebar-session" aria-live="polite"/);
  assert.match(dashboard, /className="admin-sidebar-logout-error" role="alert"/);
  assert.match(styles, /:global\(\.admin-workspace-content\)\{[^}]*min-width:0/);
  assert.match(styles, /:global\(\.admin-command-bar\)\{[^}]*min-width:0/);
  assert.match(styles, /:global\(\.admin-list\)\{[^}]*min-width:0/);
  assert.match(styles, /:global\(\.admin-list\) :global\(article\) > :global\(div\)\{[^}]*min-width:0/);
  assert.match(styles, /:global\(\.admin-workspace\) :global\(button\),:global\(\.admin-workspace\) :global\(input\),:global\(\.admin-workspace\) :global\(select\)\{[^}]*min-height:44px/);
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*:global\(\.admin-command-bar\)\{[^}]*flex-wrap:wrap/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*:global\(\.admin-command-context\)\{[^}]*width:100%/);
  assert.match(styles, /@media\(max-width:390px\)\{[\s\S]*:global\(\.admin-workspace\) :global\(\.admin-workspace-content\)\{[^}]*padding-right:12px/);
});
