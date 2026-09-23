import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const dashboardStyles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");
const formStyles = readFileSync(new URL("../src/features/seller/SellerEditorForms.module.css", import.meta.url), "utf8");
const productForm = readFileSync(new URL("../src/features/seller/SellerProductForm.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/seller/SellerTaxonomyManagement.tsx", import.meta.url), "utf8");
const promotionEditor = readFileSync(new URL("../src/features/seller/SellerPromotionEditor.tsx", import.meta.url), "utf8");

test("Seller workspaces use one readable typography hierarchy and a scoped pale operational canvas", () => {
  for (const token of ["--seller-page-title", "--seller-section-title", "--seller-body", "--seller-supporting", "--seller-label", "--seller-table-heading"]) {
    assert.match(dashboardStyles, new RegExp(token));
  }
  assert.match(dashboardStyles, /\.workspace\s*\{[\s\S]*?--seller-canvas:/);
  assert.match(dashboardStyles, /\.workspaceIntro h1\s*\{[\s\S]*?font-size:\s*var\(--seller-page-title\)/);
  assert.match(dashboardStyles, /\.workspace :global\(\.seller-form-note\)[\s\S]*?font-size:\s*var\(--seller-supporting\)/);
  assert.match(formStyles, /font-size:\s*var\(--seller-label,\s*13px\)/);
});

test("Seller workspace resets the legacy centered shell dimensions so the sidebar begins flush", () => {
  assert.match(dashboard, /seller-shell seller-workspace orchid-shell orchid-shell--operate/);
  assert.match(dashboardStyles, /\.workspace\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*none;[\s\S]*?margin:\s*0;[\s\S]*?padding:\s*0;/);
});

test("Seller action hierarchy retains real workflow labels with primary, secondary, and destructive contracts", () => {
  for (const label of ["Add a product", "Create product draft", "Save stock", "Request review", "Save profile", "Withdraw proposal", "Delete promotion"]) {
    assert.match(dashboard + productForm + taxonomy + promotionEditor, new RegExp(label));
  }
  assert.match(dashboardStyles, /\.workspace :global\(\.primary-button\)\s*\{/);
  assert.match(dashboardStyles, /\.workspace :global\(button:not\(\.primary-button\):not\(\.seller-promotion-delete\)\)\s*\{/);
  assert.match(dashboardStyles, /\.workspace :global\(\.seller-promotion-delete\)\s*\{/);
  assert.match(dashboardStyles, /:focus-visible/);
  assert.doesNotMatch(dashboardStyles, /!important/);
});

test("Seller catalog creation remains a dedicated readable route while existing workspaces keep their route conditionals", () => {
  assert.match(dashboard, /productCreationOnly \? <SellerProductForm \/>/);
  for (const section of ["overview", "catalog", "inventory", "taxonomy", "promotions", "fulfillment", "finance", "analytics", "reviews", "notifications", "profile"]) {
    assert.match(dashboard, new RegExp(`activeSection === "${section}"`));
  }
  assert.match(dashboardStyles, /@media \(max-width: 700px\)/);
  assert.match(dashboardStyles, /@media \(prefers-reduced-motion: reduce\)/);
});
