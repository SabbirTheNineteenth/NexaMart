import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSellerProductUpdate, validateSellerProductUpdate } from "../src/features/seller/seller-product-editing";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../src/features/seller/SellerProductEditor.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

test("seller product updates contain only editable detail fields", () => {
  const update = buildSellerProductUpdate({
    name: "  Studio Lamp  ", brand: "  Lumen  ", slug: "studio-lamp", description: "A warm adjustable desk lamp.",
    price: "89.50", primaryImageUrl: "https://cdn.example/lamp.jpg", colors: "Ivory, Sand, Ivory",
  });

  assert.deepEqual(update, {
    name: "Studio Lamp", brand: "Lumen", slug: "studio-lamp", description: "A warm adjustable desk lamp.",
    price: 89.5, primaryImageUrl: "https://cdn.example/lamp.jpg", colors: ["Ivory", "Sand"],
  });
  assert.deepEqual(Object.keys(update).sort(), ["brand", "colors", "description", "name", "price", "primaryImageUrl", "slug"]);
});

test("seller product detail validation rejects invalid values and empty updates", () => {
  assert.equal(validateSellerProductUpdate({ name: "", brand: "", slug: "", description: "", price: "", primaryImageUrl: "", colors: "" }), "Enter at least one product detail to update.");
  assert.match(validateSellerProductUpdate({ name: "x", brand: "", slug: "", description: "", price: "", primaryImageUrl: "", colors: "" }) ?? "", /Product name/);
  assert.match(validateSellerProductUpdate({ name: "", brand: "", slug: "bad slug", description: "", price: "", primaryImageUrl: "", colors: "" }) ?? "", /URL-friendly/);
  assert.match(validateSellerProductUpdate({ name: "", brand: "", slug: "", description: "", price: "0", primaryImageUrl: "", colors: "" }) ?? "", /Price/);
  assert.match(validateSellerProductUpdate({ name: "", brand: "", slug: "", description: "", price: "", primaryImageUrl: "not-a-url", colors: "" }) ?? "", /valid image URL/);
  assert.match(validateSellerProductUpdate({ name: "", brand: "", slug: "", description: "", price: "", primaryImageUrl: "", colors: "one, one" }) ?? "", /unique/);
});

test("seller product rows expose an accessible edit form that PATCHes only permitted fields", () => {
  assert.match(dashboard, /<SellerProductEditor product=\{product\} onSaved=/);
  assert.match(editor, /<details className="seller-product-editor">/);
  assert.match(editor, /<summary>Edit product details<\/summary>/);
  assert.match(editor, /aria-label=\{`Edit details for \$\{product\.name\}`\}/);
  assert.match(editor, /patchJSON<\{ product: SellerProductDetail \}>\(`\/seller\/products\/\$\{product\.id\}`, update\)/);
  assert.doesNotMatch(editor, /\b(?:stock|isPublished|sellerId|status)\s*:/);
  assert.match(editor, /reason instanceof ApiError && reason\.status === 404/);
  assert.match(editor, /Product was not found or is no longer available\./);
});

test("seller product types retain editable product details separately from stock and publishing", () => {
  assert.match(sellerTypes, /export type SellerProductDetail =/);
  assert.match(sellerTypes, /slug: string;/);
  assert.match(sellerTypes, /description: string;/);
  assert.match(sellerTypes, /categoryId: string \| null;/);
  assert.match(sellerTypes, /primaryImageUrl: string;/);
  assert.match(sellerTypes, /colors: string\[\];/);
});
