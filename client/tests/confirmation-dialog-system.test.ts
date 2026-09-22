import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dialog = readFileSync(new URL("../src/components/ConfirmationDialog.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const admin = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const seller = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const promotionEditor = readFileSync(new URL("../src/features/seller/SellerPromotionEditor.tsx", import.meta.url), "utf8");
const sellerTaxonomy = readFileSync(new URL("../src/features/seller/SellerTaxonomyManagement.tsx", import.meta.url), "utf8");

test("shared dashboard confirmations have a safe unified shell and dismissal contract", () => {
  assert.match(dialog, /className="confirmation-dialog-backdrop" onClick=\{handleBackdropClick\} onKeyDown=\{handleKeyDown\}/);
  assert.match(dialog, /if \(event\.target === event\.currentTarget && !pending\) onCancel\(\);/);
  assert.match(dialog, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(dialog, /aria-label="Close dialog"/);
  assert.match(dialog, /disabled=\{pending\}/);
  assert.match(dialog, /if \(event\.key === "Escape" && !pending\) onCancel\(\);/);
  assert.match(dialog, /input\[required\]:not\(\[disabled\]\),textarea\[required\]:not\(\[disabled\]\),select\[required\]:not\(\[disabled\]\)/);
  assert.match(dialog, /previouslyFocusedElement\.current\?\.focus\(\);/);
  assert.match(dialog, /confirmation-dialog-header/);
  assert.match(dialog, /confirmation-dialog-body/);
  assert.match(dialog, /confirmation-dialog-actions/);
  assert.match(styles, /\.confirmation-dialog\{[^}]*width:min\(calc\(100vw - 32px\),540px\)[^}]*border-radius:14px/);
  assert.match(styles, /@media\(max-width:520px\)\{[\s\S]*\.confirmation-dialog-actions\{display:grid/);
});

test("Admin and Seller confirmation flows retain shared actions without bespoke alertdialogs", () => {
  for (const source of [admin, taxonomy, seller, promotionEditor, sellerTaxonomy]) assert.match(source, /ConfirmationDialog/);
  assert.match(admin, /confirmLabel=\{confirmationCopy\.confirmLabel\}/);
  assert.match(taxonomy, /onConfirm=\{confirmArchive\}/);
  assert.match(seller, /onConfirm=\{confirmFulfillmentUpdate\}/);
  assert.match(promotionEditor, /confirmLabel="Confirm deletion"/);
  assert.match(sellerTaxonomy, /confirmLabel="Confirm withdrawal"/);
  assert.doesNotMatch(promotionEditor, /seller-delete-confirmation-backdrop/);
  assert.doesNotMatch(sellerTaxonomy, /seller-delete-confirmation-backdrop/);
});
