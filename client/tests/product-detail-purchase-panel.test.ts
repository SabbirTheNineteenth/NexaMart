import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const factStyles = readFileSync(new URL("../src/features/catalog/ProductDetail.module.css", import.meta.url), "utf8");

test("C06 presents the real purchase controls as a bounded product-detail action panel", () => {
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-detail-media\{border:1px solid var\(--nx-border\);padding:8px;background:var\(--nx-surface-panel\)\}/);
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-detail-summary\{padding:22px;border:1px solid var\(--nx-border\);background:var\(--nx-surface-panel\)/);
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-purchase-panel\{width:100%;margin-top:20px;border-top:1px solid var\(--nx-border\);padding-top:16px\}/);
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-detail-actions\{width:100%;align-items:stretch\}/);
  assert.match(styles, /@media\(max-width:760px\)\{[^}]*\}\.product-detail-shell\.orchid-explore \.product-detail-summary\{padding:16px\}/);
  assert.match(styles, /@media\(max-width:760px\)\{\.product-detail-shell\.orchid-explore>\.product-detail\{width:min\(1120px,calc\(100% - 32px\)\)\}/);
});

test("C06 keeps both product-detail grid columns contained at narrow viewports", () => {
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-detail>:is\(\.product-detail-media,\.product-detail-copy\)\{min-width:0\}/);
});

test("C06 keeps the real loading and retry states inside the customer detail frame", () => {
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-detail-state\{width:min\(1120px,calc\(100% - 32px\)\);margin:48px auto 0;border:1px solid var\(--nx-border\);background:var\(--nx-surface-panel\);padding:18px\}/);
  assert.match(styles, /\.product-detail-state \.seller-state\{margin:0\}/);
  assert.match(styles, /\.product-detail-state \.message\{padding:0;background:transparent\}/);
});

test("C06 keeps truthful cart and saved-piece feedback in the bounded purchase hierarchy", () => {
  assert.match(styles, /\.product-detail-shell\.orchid-explore \.product-purchase-feedback\{width:100%;margin-top:12px;border-left:2px solid var\(--nx-orchid\);padding:8px 10px;background:var\(--nx-surface-control\)\}/);
});

test("C06 presents returned availability and category facts as a compact panel ledger", () => {
  assert.match(factStyles, /\.facts\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);border:1px solid var\(--nx-border\);background:var\(--nx-surface-control\)\}/);
  assert.match(factStyles, /\.facts div\{min-width:0;border:0;padding:9px 10px\}/);
  assert.match(factStyles, /@media\(max-width:760px\)\{\.facts\{grid-template-columns:1fr\}/);
});

test("C06 keeps real variant selection and stock rows in a compact contained detail panel", () => {
  assert.match(factStyles, /\.variantPanel\{width:100%;margin:18px 0 0;border:1px solid var\(--nx-border\);background:var\(--nx-surface-control\);padding:12px\}/);
  assert.match(factStyles, /\.variantPanel ul\{border:1px solid var\(--nx-border\);background:var\(--nx-surface-panel\)\}/);
  assert.match(factStyles, /\.variantPanel li\{min-width:0;padding:10px\}/);
  assert.match(factStyles, /@media\(max-width:760px\)\{\.variantPanel\{padding:10px\}/);
});
