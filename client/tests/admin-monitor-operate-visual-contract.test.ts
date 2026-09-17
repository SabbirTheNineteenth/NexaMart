import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/admin/AdminDashboard.module.css", import.meta.url), "utf8");

test("VISUAL-ADMIN-01 keeps the monitor/operate hierarchy compact, feed-backed, and narrow-safe", () => {
  assert.match(dashboard, /className="admin-utility-bar admin-command-bar"/);
  assert.match(dashboard, /className="admin-command-context"/);
  assert.match(dashboard, /className="admin-queue-deck"/);
  assert.match(dashboard, /Seller applications/);
  assert.match(dashboard, /Product reviews/);
  assert.match(dashboard, /Catalog risks/);
  assert.match(dashboard, /Open orders/);
  assert.doesNotMatch(dashboard, /Operational workspace/);

  assert.match(styles, /:global\(\.admin-command-bar\)\{[\s\S]*position:sticky/);
  assert.match(styles, /:global\(\.admin-queue-deck\)\{[\s\S]*grid-template-columns:repeat\(4/);
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*:global\(\.admin-command-bar\)\{[\s\S]*align-items:flex-start/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*:global\(\.admin-queue-deck\)\{[\s\S]*grid-template-columns:1fr/);
});

test("VISUAL-7/05 makes the overview a compact governance briefing before secondary search", () => {
  assert.match(dashboard, /className="admin-overview-briefing"/);
  assert.match(dashboard, /className="admin-overview-command-deck" aria-label="Governance queues"/);
  assert.match(dashboard, /href="\/admin\/applications"/);
  assert.match(dashboard, /href="\/admin\/products"/);
  assert.match(dashboard, /href="\/admin\/taxonomy"/);
  assert.match(dashboard, /href="\/admin\/audit"/);
  assert.match(dashboard, /aria-live="polite"/);
  assert.ok(dashboard.indexOf('className="admin-overview-briefing"') < dashboard.indexOf('className="admin-panel admin-global-search"'));

  assert.match(styles, /:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:repeat\(4/);
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:repeat\(2/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*:global\(\.admin-overview-command-deck\)\{[\s\S]*grid-template-columns:1fr/);
});

test("VISUAL-7/05 keeps the briefing deck action-led and exposes loaded queue state", () => {
  const briefingStart = dashboard.indexOf('className="admin-overview-briefing"');
  const briefingEnd = dashboard.indexOf('<section className="admin-metrics"', briefingStart);
  const briefing = dashboard.slice(briefingStart, briefingEnd);

  assert.match(briefing, /aria-busy=\{sellerLoading \|\| productLoading \|\| financeLoading\}/);
  assert.match(briefing, /<span>Seller applications<\/span>/);
  assert.match(briefing, /<span>Product moderation<\/span>/);
  assert.match(briefing, /<span>Taxonomy governance<\/span>/);
  assert.match(briefing, /<span>Payout review<\/span>/);
  assert.match(briefing, /href="\/admin\/finance"/);
  assert.match(briefing, /finance\.payouts\.filter\(\(payout\) => payout\.status === "pending"\)\.length/);
  assert.doesNotMatch(briefing, /Approve review|Reject review/);

  assert.match(styles, /:global\(\.admin-overview-command-deck\)\{[\s\S]*border:1px solid var\(--admin-line\)/);
  assert.match(styles, /:global\(\.admin-overview-command-deck\) :global\(a:focus-visible\)\{/);
});
