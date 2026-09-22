import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const productForm = readFileSync(new URL("../src/features/seller/SellerProductForm.tsx", import.meta.url), "utf8");
const formStyles = readFileSync(new URL("../src/features/seller/SellerEditorForms.module.css", import.meta.url), "utf8");
const route = new URL("../src/app/seller/catalog/add/page.tsx", import.meta.url);

test("seller catalog uses a protected dedicated add-product route instead of an inline disclosure", () => {
  assert.equal(existsSync(route), true);
  assert.match(dashboard, /href="\/seller\/catalog\/add"/);
  const catalogStart = dashboard.indexOf('activeSection === "catalog" && <section');
  const catalogEnd = dashboard.indexOf('activeSection === "inventory" && <section', catalogStart);
  assert.doesNotMatch(dashboard.slice(catalogStart, catalogEnd), /<SellerProductForm/);
  assert.match(readFileSync(route, "utf8"), /RoleProtectedWorkspace role="seller"/);
  assert.match(readFileSync(route, "utf8"), /productCreationOnly/);
  assert.match(dashboard, /productCreationOnly \? "catalog"/);
});

test("dedicated product creation keeps every real product field and classifies with API-backed active taxonomy", () => {
  for (const name of ["name", "description", "image", "colors", "price", "stock", "categoryId", "subcategoryId", "brandId"]) {
    assert.match(productForm, new RegExp(`name="${name}"`));
  }
  assert.match(productForm, /getJSON<SellerTaxonomyOptions>\("\/seller\/taxonomy\/options"/);
  assert.match(productForm, /taxonomy\.subcategories\.filter\(\(subcategory\) => subcategory\.categoryId === categoryId\)/);
  assert.match(productForm, /disabled=\{!categoryId/);
  assert.match(productForm, /Back to catalog/);
  assert.match(productForm, /Create product draft/);
  assert.doesNotMatch(productForm, /<details/);
});

test("the classified creation form stays single-column and touch-readable on narrow screens", () => {
  assert.match(formStyles, /\.productCreation :global\(\.seller-form-grid\) \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(formStyles, /@media \(max-width: 700px\)[\s\S]*?\.surface :global\(\.seller-form-grid\) \{\s*grid-template-columns: 1fr/);
  assert.match(formStyles, /\.productCreation :is\(input, select, textarea\) \{[\s\S]*?min-height: 44px/);
  assert.match(formStyles, /@media \(prefers-reduced-motion: reduce\)/);
});

test("classified product payload stays within the existing create contract and sends selected taxonomy IDs only", () => {
  assert.match(productForm, /postJSON<\{ product: DraftProduct \}>\(\s*"\/seller\/products"/);
  assert.match(productForm, /\.\.\.\(selectedCategoryId \? \{ categoryId: selectedCategoryId \} : \{\}\)/);
  assert.match(productForm, /\.\.\.\(subcategoryId \? \{ subcategoryId \} : \{\}\)/);
  assert.match(productForm, /\.\.\.\(brandId \? \{ brandId \} : \{\}\)/);
});
