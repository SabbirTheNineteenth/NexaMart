import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { millisecondsUntilNextDealRefresh } from "../src/features/catalog/deals-refresh";

const dealsPagePath = new URL("../src/app/deals/page.tsx", import.meta.url);
const dealsPath = new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url);
const stylesPath = new URL("../src/features/catalog/DealsDiscovery.module.css", import.meta.url);

function source(path: URL) {
  assert.ok(existsSync(path), `${path.pathname} must exist`);
  return readFileSync(path, "utf8");
}

test("public deals route renders the dedicated active-deals discovery experience", () => {
  assert.match(source(dealsPagePath), /return <DealsDiscovery\/>;/);
  const deals = source(dealsPath);
  assert.match(deals, /<main className="deals-discovery customer-experience orchid-explore">/);
  assert.match(deals, /<h1 id="deals-heading">Active deals<\/h1>/);
  assert.match(deals, /<ExploreHeader active="deals" \/>/);
});

test("deals discovery requests and refreshes only server-confirmed active deals", () => {
  const deals = source(dealsPath);
  assert.match(deals, /getJSON<\{ products: Product\[\] \}>\("\/catalog\/products\?deals=active", controller\.signal\)/);
  assert.match(deals, /millisecondsUntilNextDealRefresh\(activeDeals\)/);
  assert.match(deals, /window\.setTimeout\(\(\) => setReloadNonce\(\(value\) => value \+ 1\), refreshAfterMs\)/);
  assert.doesNotMatch(deals, /\.filter\([^)]*(?:promotion|endsAt|effectivePrice|basePrice)/);
  assert.doesNotMatch(deals, /Date\.now|new Date\(|basePrice|Was \{|Save \{|discountPercent|promotion\.name/);
});

test("deal refresh timing uses the earliest valid server-provided promotion expiry", () => {
  const now = new Date("2026-09-13T12:00:00.000Z");
  assert.equal(millisecondsUntilNextDealRefresh([{ promotion: { endsAt: "2026-09-13T12:05:00.000Z" } }, { promotion: { endsAt: "2026-09-13T12:01:30.000Z" } }, { promotion: { endsAt: "invalid" } }, {}], now), 90_000);
});

test("deals gives every authoritative outcome an accessible existing recovery or navigation path", () => {
  const deals = source(dealsPath);
  assert.match(deals, /role="status" aria-live="polite">Loading active deals\.\.\./);
  assert.match(deals, /role="alert">Active deals are temporarily unavailable\./);
  assert.match(deals, /className=\{styles\.retryButton\}/);
  assert.match(deals, /setState\("loading"\); setReloadNonce\(\(value\) => value \+ 1\)/);
  assert.match(deals, /No active deals are available right now\./);
  assert.match(deals, /className=\{styles\.catalogLink\} href="\/">Browse the catalog/);
});

test("deals keeps card context factual, scannable, responsive, and reduced-motion aware", () => {
  const deals = source(dealsPath);
  const styles = source(stylesPath);
  assert.match(deals, /href=\{`\/products\/\$\{product\.slug\}`\}/);
  assert.match(deals, /<p className=\{styles\.dealMeta\}>Active now<\//);
  assert.match(deals, /<p className=\{styles\.confirmation\}>Server-confirmed active deal<\//);
  assert.match(styles, /\.results \{ display: grid; grid-template-columns: repeat\(auto-fill, minmax\(190px, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
