import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { millisecondsUntilNextDealRefresh } from "../src/features/catalog/deals-refresh";

const dealsPagePath = new URL("../src/app/deals/page.tsx", import.meta.url);
const dealsPath = new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url);
const storefrontPath = new URL("../src/features/catalog/Storefront.tsx", import.meta.url);
const stylesPath = new URL("../src/app/globals.css", import.meta.url);

function source(path: URL) {
  assert.ok(existsSync(path), `${path.pathname} must exist`);
  return readFileSync(path, "utf8");
}

test("public deals route renders the dedicated active-deals discovery experience", () => {
  const page = source(dealsPagePath);
  const deals = source(dealsPath);

  assert.match(page, /import \{ DealsDiscovery \} from "@\/features\/catalog\/DealsDiscovery";/);
  assert.match(page, /return <DealsDiscovery\/>;/);
  assert.match(deals, /"use client";/);
  assert.match(deals, /<main className="deals-discovery customer-experience orchid-explore">/);
  assert.match(deals, /<h1 id="deals-heading">Active deals<\/h1>/);
});

test("deals discovery requests only server-confirmed active deals and never locally decides eligibility", () => {
  const deals = source(dealsPath);

  assert.match(deals, /getJSON<\{ products: Product\[\] \}>\("\/catalog\/products\?deals=active", controller\.signal\)/);
  assert.doesNotMatch(deals, /\.filter\([^)]*(?:promotion|endsAt|effectivePrice|basePrice)/);
  assert.doesNotMatch(deals, /Date\.now|new Date\(/);
  assert.doesNotMatch(deals, /sort=/);
});

test("deal refresh timing uses the earliest valid server-provided promotion expiry", () => {
  const now = new Date("2026-09-13T12:00:00.000Z");

  assert.equal(millisecondsUntilNextDealRefresh([
    { promotion: { endsAt: "2026-09-13T12:05:00.000Z" } },
    { promotion: { endsAt: "2026-09-13T12:01:30.000Z" } },
    { promotion: { endsAt: "invalid" } },
    {},
  ], now), 90_000);
});

test("deals discovery schedules a new authoritative request at the next promotion expiry", () => {
  const deals = source(dealsPath);

  assert.match(deals, /millisecondsUntilNextDealRefresh\(activeDeals\)/);
  assert.match(deals, /window\.setTimeout\(\(\) => setReloadNonce\(\(value\) => value \+ 1\), refreshAfterMs\)/);
  assert.match(deals, /return \(\) => \{ controller\.abort\(\); if \(refreshTimer !== undefined\) window\.clearTimeout\(refreshTimer\); \};/);
});

test("deals discovery has labeled product links, server price context, and accessible load states", () => {
  const deals = source(dealsPath);

  assert.match(deals, /<section[^>]*aria-labelledby="deals-heading"/);
  assert.match(deals, /role="status" aria-live="polite">Loading active deals…/);
  assert.match(deals, /role="alert">Active deals are temporarily unavailable\./);
  assert.match(deals, /Retry active deals/);
  assert.match(deals, /setState\("loading"\); setReloadNonce\(\(value\) => value \+ 1\)/);
  assert.match(deals, /No active deals are available right now\./);
  assert.match(deals, /href=\{`\/products\/\$\{product\.slug\}`\}/);
  assert.match(deals, /<img[^>]*src=\{image\}[^>]*alt=\{product\.name\}/);
  assert.match(deals, /Server-confirmed active deal/);
  assert.doesNotMatch(deals, /basePrice|Was \{|Save \{|discountPercent|promotion\.name/);
  assert.match(deals, /<span className="sr-only">Current price: <\/span>/);
});

test("deals keeps the panel-01 Explore header and presents every authoritative feed outcome in one bounded state frame", () => {
  const deals = source(dealsPath);
  const styles = source(stylesPath);

  assert.match(deals, /<ExploreHeader active="deals" \/>/);
  assert.match(deals, /className="deals-collection-state" aria-busy=\{state === "loading"\}/);
  assert.match(deals, /className="marketplace-load-state deals-state-frame" role="status"/);
  assert.match(deals, /className="marketplace-load-state deals-state-frame" role="alert"/);
  assert.match(styles, /\.orchid-explore \.deals-state-frame\{[^}]*border-left:2px solid var\(--nx-orchid\)/);
  assert.match(styles, /@media\(max-width:760px\)\{[^}]*\.orchid-explore \.deals-state-frame\{margin:0;/);
});

test("deals keeps populated server results in the same bounded customer state surface as loading, empty, and retry outcomes", () => {
  const deals = source(dealsPath);
  const styles = source(stylesPath);

  assert.match(deals, /<div className="deals-results-frame marketplace-rail product-spotlight-rail">/);
  assert.match(styles, /\.orchid-explore \.deals-results-frame\{[^}]*border:1px solid var\(--nx-border\)/);
  assert.match(styles, /\.orchid-explore \.deals-results-frame\{margin:0;padding:8px;/);
});

test("the storefront header includes a real Deals destination", () => {
  const storefront = source(storefrontPath);

  assert.doesNotMatch(storefront, /<Link className="marketplace-account" href="\/deals">Deals<\/Link>/);
});

test("deals discovery uses responsive cards with visible keyboard focus", () => {
  const styles = source(stylesPath);

  assert.match(styles, /\.deals-grid\{display:grid;/);
  assert.match(styles, /\.deals-product-link:focus-visible\{outline:3px solid/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*\.deals-grid\{grid-template-columns:1fr/);
});
