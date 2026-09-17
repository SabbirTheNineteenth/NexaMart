import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextGalleryImageSortOrder, parseVariantOptions } from "../src/features/seller/SellerProductAssets";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const assets = readFileSync(new URL("../src/features/seller/SellerProductAssets.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

test("seller product rows expose an accessible asset editor for each owned product", () => {
  assert.match(dashboard, /<SellerProductAssets product=\{product\} \/>/);
  assert.match(assets, /<details[^>]*className="seller-product-assets"/);
  assert.match(assets, /aria-label=\{`Variants for \$\{product\.name\}`\}/);
});

test("seller product asset editor lists and creates variants using seller-only endpoints", () => {
  assert.match(assets, /getJSON<\{ variants: SellerProductVariant\[\] \}>\(`/);
  assert.match(assets, /`\/seller\/products\/\$\{product\.id\}\/variants`/);
  assert.match(assets, /postJSON<\{ variant: SellerProductVariant \}>\(`/);
  assert.match(assets, /name="sku"/);
  assert.match(assets, /name="options"/);
  assert.match(assets, /name="price"/);
  assert.match(assets, /name="stock"/);
  assert.match(assets, /Add variant/);
});

test("seller variant options retain named values and ignore incomplete entries", () => {
  assert.deepEqual(parseVariantOptions("Color: White, Size: Large, malformed, Material: "), { Color: "White", Size: "Large" });
});

test("seller variant types retain a SKU, options, price, and stock", () => {
  assert.match(sellerTypes, /export type SellerProductVariant =/);
  assert.match(sellerTypes, /sku: string;/);
  assert.match(sellerTypes, /options: Record<string, string>;/);
  assert.match(sellerTypes, /price: string;/);
  assert.match(sellerTypes, /stock: number;/);
});

test("seller product asset editor lists and creates gallery images using seller-only endpoints", () => {
  assert.match(assets, /<summary>Manage variants and gallery<\/summary>/);
  assert.match(assets, /aria-label=\{`Gallery images for \$\{product\.name\}`\}/);
  assert.match(assets, /getJSON<\{ images: SellerGalleryImage\[\] \}>\(`/);
  assert.match(assets, /`\/seller\/products\/\$\{product\.id\}\/gallery-images`/);
  assert.match(assets, /postJSON<\{ image: SellerGalleryImage \}>\(`/);
  assert.match(assets, /name="imageUrl"/);
  assert.match(assets, /name="altText"/);
  assert.match(assets, /name="sortOrder"/);
  assert.match(assets, /Add image/);
  assert.match(sellerTypes, /export type SellerGalleryImage =/);
  assert.match(sellerTypes, /imageUrl: string;/);
  assert.match(sellerTypes, /sortOrder: number;/);
});

test("seller product asset editor provides accessible variant edits that PATCH only the selected local variant", () => {
  assert.match(assets, /import \{ ApiError, getJSON, patchJSON, postJSON \} from "@\/lib\/api"/);
  assert.match(assets, /aria-label=\{`Edit variant \$\{variant\.sku\}`\}/);
  assert.match(assets, /patchJSON<\{ variant: SellerProductVariant \}>\(`\/seller\/products\/\$\{product\.id\}\/variants\/\$\{variant\.id\}`, \{/);
  assert.match(assets, /setVariants\(\(items\) => items\.map\(\(item\) => item\.id === response\.variant\.id \? response\.variant : item\)\)/);
  assert.match(assets, /Saving variant…/);
  assert.match(assets, /reason instanceof ApiError && reason\.status === 409/);
  assert.match(assets, /This SKU is already used by another variant\./);
});

test("seller product asset editor provides accessible gallery image edits that PATCH only the selected local image", () => {
  assert.match(assets, /aria-label=\{`Edit image \$\{image\.sortOrder \+ 1\}`\}/);
  assert.match(assets, /patchJSON<\{ image: SellerGalleryImage \}>\(`\/seller\/products\/\$\{product\.id\}\/gallery-images\/\$\{image\.id\}`, \{/);
  assert.match(assets, /setImages\(\(items\) => items\.map\(\(item\) => item\.id === response\.image\.id \? response\.image : item\)\.sort\(\(left, right\) => left\.sortOrder - right\.sortOrder\)\)/);
  assert.match(assets, /Saving image…/);
  assert.doesNotMatch(assets, /\bdeleteJSON\b|\bDELETE\b/);
});

test("new gallery image positions follow the highest loaded position", () => {
  assert.equal(nextGalleryImageSortOrder([]), 0);
  assert.equal(nextGalleryImageSortOrder([{ id: "image-2", imageUrl: "https://cdn.example/side.jpg", sortOrder: 2 }, { id: "image-7", imageUrl: "https://cdn.example/front.jpg", sortOrder: 7 }]), 8);
});

test("gallery position conflicts give scoped actionable feedback without leaking server errors", () => {
  assert.equal((assets.match(/reason instanceof ApiError && reason\.status === 409 \? "Choose a different gallery image position\."/g) ?? []).length, 2);
  assert.match(assets, /const \[nextImageSortOrder, setNextImageSortOrder\] = useState\(0\);/);
  assert.match(assets, /setNextImageSortOrder\(nextGalleryImageSortOrder\(imageResponse\.images\)\);/);
  assert.match(assets, /setNextImageSortOrder\(nextGalleryImageSortOrder\(\[\.\.\.images, response\.image\]\)\);/);
  assert.match(assets, /value=\{nextImageSortOrder\}/);
});
