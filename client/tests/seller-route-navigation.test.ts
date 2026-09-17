import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const sellerSectionRoute = readFileSync(new URL("../src/app/seller/[section]/page.tsx", import.meta.url), "utf8");

test("seller operations are individually addressable within a persistent workspace navigation", () => {
  assert.equal(existsSync(new URL("../src/app/seller/[section]/page.tsx", import.meta.url)), true);
  assert.match(dashboard, /usePathname/);
  assert.match(dashboard, /className=\{styles\.sellerSidebar\}/);
  for (const section of ["overview", "catalog", "inventory", "taxonomy", "promotions", "fulfillment", "finance", "reviews", "profile", "analytics"]) {
    assert.match(dashboard, new RegExp(`section: "${section}"`));
  }
  assert.match(dashboard, /href=\{`\/seller\/\$\{item\.section\}`\}/);
  assert.match(dashboard, /data-seller-section=\{activeSection\}/);
});

test("seller catalog and inventory are distinct addressable navigation entries", () => {
  assert.match(dashboard, /section: "catalog", label: "Catalog"/);
  assert.match(dashboard, /section: "inventory", label: "Inventory"/);
  assert.match(dashboard, /href="\/seller\/catalog"|href=\{`\/seller\/\$\{item\.section\}`\}/);
  assert.match(sellerSectionRoute, /"catalog"/);
  assert.match(sellerSectionRoute, /"inventory"/);
});

test("seller dynamic route allowlists only implemented workspace sections and sends unknown sections to notFound", () => {
  for (const section of ["overview", "analytics", "profile", "catalog", "inventory", "taxonomy", "promotions", "fulfillment", "finance", "reviews", "notifications"]) {
    assert.match(sellerSectionRoute, new RegExp(`"${section}"`));
  }
  assert.match(sellerSectionRoute, /const sections = new Set\(\[/);
  assert.match(sellerSectionRoute, /if \(!sections\.has\(section\)\) notFound\(\);/);
  assert.match(sellerSectionRoute, /import \{ notFound \} from "next\/navigation"/);
});
