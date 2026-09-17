import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adminSearchPath, normalizeAdminSearchInput } from "../src/features/admin/admin-global-search";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin global search normalizes nonblank queries and keeps the server limit bounded", () => {
  assert.deepEqual(normalizeAdminSearchInput("  studio lamp  ", "25"), { query: "studio lamp", limit: 25 });
  assert.deepEqual(normalizeAdminSearchInput("lamp", "26"), { query: "lamp", limit: 10 });
  assert.deepEqual(normalizeAdminSearchInput("   ", "1"), null);
  assert.equal(adminSearchPath({ query: "bright & home", limit: 25 }), "/admin/search?q=bright+%26+home&limit=25");
});

test("admin global search provides labeled accessible form, protected endpoint, and result states", () => {
  assert.match(dashboard, /<h2 id="admin-search-heading">Global search<\/h2>/);
  assert.match(dashboard, /<label htmlFor="admin-global-search">Search marketplace records<\/label>/);
  assert.match(dashboard, /<input id="admin-global-search"[^>]*type="search"/);
  assert.match(dashboard, /aria-describedby="admin-global-search-help"/);
  assert.match(dashboard, /<p id="admin-global-search-help"/);
  assert.match(dashboard, /<button type="submit"[^>]*>\{searchLoading \? "Searching…" : "Search"\}<\/button>/);
  assert.match(dashboard, /getJSON<\{ results: AdminSearchResult\[\] \}>\(adminSearchPath\(input\)/);
  assert.doesNotMatch(dashboard, /(?:products|orders|sellers)\.filter\([^\n]*search/i);
  assert.match(dashboard, /role="status" aria-live="polite"/);
  assert.match(dashboard, /role="alert"/);
  assert.match(dashboard, /No records match/);
  assert.match(dashboard, /result\.type === "seller"/);
  assert.match(dashboard, /result\.type === "product"/);
  assert.match(dashboard, /<strong>\{result\.reference\}<\/strong>/);
  assert.match(styles, /\.admin-global-search-form\{[^}]*display:grid/);
  assert.match(styles, /\.admin-search-results\{[^}]*display:grid/);
});

test("admin global-search Open actions link to their truthful operational workspaces", () => {
  assert.match(dashboard, /<Link href="\/admin\/sellers" aria-label=\{`Open seller moderation for \$\{result\.storeName\}`\}>Open seller moderation<\/Link>/);
  assert.match(dashboard, /<Link href="\/admin\/products" aria-label=\{`Open product oversight for \$\{result\.name\}`\}>Open product oversight<\/Link>/);
  assert.match(dashboard, /<Link href="\/admin\/orders" aria-label=\{`Open order oversight for \$\{result\.reference\}`\}>Open order oversight<\/Link>/);
  assert.doesNotMatch(dashboard, /href="#(?:seller-moderation-heading|product-oversight-heading|orders)"/);
});
