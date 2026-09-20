import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("VISUAL-ADMIN-01 keeps the monitor/operate hierarchy compact, feed-backed, and narrow-safe", () => {
  assert.match(dashboard, /className="admin-utility-bar admin-command-bar"/);
  assert.match(dashboard, /className="admin-command-context"/);
  for (const label of ["Seller Review", "Product Moderation", "Payout Review", "Admin Audit"]) assert.match(dashboard, new RegExp(label));
  assert.doesNotMatch(dashboard, /Operational workspace/);
  assert.match(styles, /:global\(\.admin-command-bar\)\{[\s\S]*position:sticky/);
  assert.match(styles, /:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:repeat\(4/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:1fr/);
});

test("VISUAL-7/05 makes the overview a compact governance briefing before secondary search", () => {
  assert.match(dashboard, /className="admin-overview-briefing"/);
  assert.match(dashboard, /className="admin-overview-command-deck" aria-label="Governance queues"/);
  for (const href of ["/admin/applications", "/admin/products", "/admin/finance", "/admin/audit"]) assert.match(dashboard, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
  assert.match(dashboard, /aria-live="polite"/);
  assert.ok(dashboard.indexOf('className="admin-overview-briefing"') < dashboard.indexOf('className="admin-panel admin-global-search"'));
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:repeat\(2/);
});

test("VISUAL-7/05 keeps the briefing deck action-led and exposes loaded queue state", () => {
  const start = dashboard.indexOf('className="admin-overview-briefing"');
  const briefing = dashboard.slice(start, dashboard.indexOf('<section className="admin-grid">', start));
  assert.match(briefing, /aria-busy=\{sellerLoading \|\| productLoading \|\| financeLoading \|\| auditLoading\}/);
  assert.match(briefing, /finance\.payouts\.filter\(\(payout\) => payout\.status === "pending"\)\.length/);
  assert.match(briefing, /data\.auditRecords\.length/);
  assert.doesNotMatch(briefing, /Taxonomy governance|Approve review|Reject review/);
});
