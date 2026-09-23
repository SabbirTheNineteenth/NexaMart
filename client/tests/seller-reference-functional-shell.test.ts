import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/seller/SellerTaxonomyManagement.tsx", import.meta.url), "utf8");

const operationalSections = [
  ["Operational analytics", "seller-analytics-heading"],
  ["Store profile", "seller-profile-heading"],
  ["Inventory", "seller-catalog-heading"],
  ["Taxonomy", "seller-taxonomy-heading"],
  ["Promotions", "seller-promotions-heading"],
  ["Fulfillment", "seller-orders-heading"],
  ["Finance", "seller-finance-heading"],
  ["Reviews", "seller-reviews-heading"],
] as const;

test("seller operations rail exposes every implemented owned workflow as a route", () => {
  const rail = dashboard.match(/<nav className=\{styles\.sellerNavigation\}[\s\S]*?<\/nav>/)?.[0] ?? "";

  for (const [label, headingId] of operationalSections) {
    assert.match(rail, /href=\{`\/seller\/\$\{item\.section\}`\}/);
    assert.match(rail, /\{item\.label\}/);
    const source = headingId === "seller-taxonomy-heading" ? taxonomy : dashboard;
    assert.match(source, new RegExp(`id="${headingId}"`));
  }
});

test("seller operate shell keeps the reference command hierarchy and an accessible mobile rail", () => {
  assert.match(dashboard, /from "lucide-react"/);
  assert.match(dashboard, /aria-label="NexaMart seller operations"/);
  assert.match(dashboard, /aria-label="Seller workspace command"/);
  assert.match(dashboard, /data-seller-rail="persistent"/);
  assert.match(dashboard, /<nav className=\{styles\.sellerNavigation\}/);

  const css = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");
  assert.match(css, /grid-template-columns:\s*264px minmax\(0,\s*1fr\)/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.sellerNavigation\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.sellerNavigation a:focus-visible/);
});

test("seller workflow sections retain concrete API-backed actions and truthful promotion copy", () => {
  for (const endpoint of [
    "/seller/products",
    "/seller/products/${product.id}/stock",
    "/seller/order-items/${item.id}/fulfillment",
    "/seller/promotions",
    "/seller/profile",
  ]) {
    assert.ok(dashboard.includes(endpoint), `missing seller workflow endpoint: ${endpoint}`);
  }
  for (const endpoint of ["/seller/taxonomy/options", "/seller/taxonomy/proposals"]) {
    assert.ok(taxonomy.includes(endpoint), `missing taxonomy workflow endpoint: ${endpoint}`);
  }

  assert.match(dashboard, /Server-priced product offers only\. Checkout decides eligibility and final prices\./);
  assert.doesNotMatch(dashboard, /promotion.*(payment|delivery|n8n)/i);
});
