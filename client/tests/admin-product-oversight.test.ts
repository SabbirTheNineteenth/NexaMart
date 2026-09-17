import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");

test("admin dashboard presents an accessible read-only product oversight panel", () => {
  assert.match(dashboard, /<section className="admin-panel admin-product-oversight" aria-labelledby="product-oversight-heading">/);
  assert.match(dashboard, /<h2 id="product-oversight-heading">Product oversight<\/h2>/);
  assert.match(dashboard, /Read-only catalog records with category, seller, store, and publication context\./);
  assert.match(dashboard, /data\.products\.map\(\(product\)/);
  assert.match(dashboard, /Category: \{product\.category\?\.name \?\? "Uncategorized"\}/);
  assert.match(dashboard, /Seller: \{product\.seller\?\.name \?\? "Unassigned"\}/);
  assert.match(dashboard, /Store: \{product\.seller\?\.storeName \?\? "No store profile"\}/);
  assert.match(dashboard, /product\.isPublished \? "Published" : "Unpublished"/);
});

test("admin product oversight communicates loading, errors, and an empty catalog", () => {
  assert.match(dashboard, /Loading product records…/);
  assert.match(dashboard, /Unable to load product records\./);
  assert.match(dashboard, /No products are available for oversight\./);
});

test("admin product oversight types preserve category, seller, store, and publication context", () => {
  assert.match(adminTypes, /export type AdminProduct = \{/);
  assert.match(adminTypes, /category: \{ id: string; name: string; slug: string \} \| null;/);
  assert.match(adminTypes, /seller: \{ id: string; name: string; storeName\?: string; storeSlug\?: string; status\?: "pending" \| "approved" \| "rejected" \| "suspended" \| "active" \} \| null;/);
  assert.match(adminTypes, /primaryImageUrl: string;/);
  assert.match(adminTypes, /isPublished: boolean;/);
  assert.match(adminTypes, /expectedRevision: string;/);
  assert.doesNotMatch(adminTypes, /expectedRevision\?: string;/);
});

test("admin product oversight limits mutations to publication moderation", () => {
  const productPanelStart = dashboard.indexOf('className="admin-panel admin-product-oversight"');
  const productPanelEnd = dashboard.indexOf('className="admin-panel admin-finance"', productPanelStart);
  const productPanel = dashboard.slice(productPanelStart, productPanelEnd);
  assert.doesNotMatch(productPanel, /patchJSON\([^)]*(?:price|stock|category|seller)/i);
  assert.doesNotMatch(productPanel, /postJSON\([^)]*products/i);
  assert.doesNotMatch(productPanel, /deleteJSON\([^)]*products/i);
});

test("admin product oversight shows seller revision details before its publication-only action", () => {
  const productPanelStart = dashboard.indexOf('className="admin-panel admin-product-oversight"');
  const productPanelEnd = dashboard.indexOf('className="admin-panel admin-finance"', productPanelStart);
  const productPanel = dashboard.slice(productPanelStart, productPanelEnd);
  assert.match(productPanel, /Description: \{product\.description \?\? "No description provided\."\}/);
  assert.match(productPanel, /Colors: \{product\.colors\?\.length \? product\.colors\.join\(", "\) : "No colors specified"\}/);
  assert.match(productPanel, /Gallery images/);
  assert.match(productPanel, /Variants/);
  assert.match(productPanel, /SKU: \{variant\.sku\}/);
  assert.ok(productPanel.indexOf("Description:") < productPanel.indexOf("admin-publication-action"));
  assert.match(productPanel, /const galleryImages = \(product\.galleryImages \?\? \[\]\)\.flatMap/);
  assert.match(dashboard, /const safeReviewImageUrl = \(imageUrl: string\)[\s\S]*url\.protocol === "https:" \|\| url\.protocol === "http:"/);
  assert.match(productPanel, /galleryImages\.length \? galleryImages\.map/);
  assert.match(productPanel, /No gallery images provided\./);
  assert.match(productPanel, /alt=\{image\.altText \?\? `\$\{product\.name\} gallery image`\}/);
});

test("admin product oversight types expose only safe revision display fields", () => {
  assert.match(adminTypes, /description\?: string;/);
  assert.match(adminTypes, /colors\?: string\[\];/);
  assert.match(adminTypes, /galleryImages\?: \{ imageUrl: string; altText: string \| null; sortOrder: number \}\[\];/);
  assert.match(adminTypes, /variants\?: \{ sku: string; options: Record<string, string>; price: number; stock: number \}\[\];/);
  assert.doesNotMatch(adminTypes, /galleryImages\?: \{[^}]*\bid:|galleryImages\?: \{[^}]*productId:|variants\?: \{[^}]*\bid:|variants\?: \{[^}]*productId:/);
});
