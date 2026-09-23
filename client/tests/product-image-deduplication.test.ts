import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizedProductImageUrl, uniqueProductGalleryImages } from "../src/features/catalog/product-presentation";

const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../src/features/catalog/product-presentation.ts", import.meta.url), "utf8");

test("catalog presentation has stable URL and ordered gallery dedupe helpers", () => {
  assert.match(presentation, /export function normalizedProductImageUrl/);
  assert.match(presentation, /export function uniqueProductGalleryImages/);
});

test("gallery view keeps the primary first and removes normalized repeats while retaining distinct angles", () => {
  const gallery = uniqueProductGalleryImages("https://CDN.example.test/main.jpg#top", [
    { imageUrl: "https://cdn.example.test/main.jpg", altText: "Duplicate", sortOrder: 0 },
    { imageUrl: "https://cdn.example.test/side.jpg?crop=wide", altText: "Side", sortOrder: 1 },
  ], "Primary");
  assert.deepEqual(gallery.map((image) => image.imageUrl), ["https://CDN.example.test/main.jpg#top", "https://cdn.example.test/side.jpg?crop=wide"]);
  assert.equal(normalizedProductImageUrl(" HTTPS://cdn.example.test/main.jpg#new "), "https://cdn.example.test/main.jpg");
});

test("product detail renders a de-duplicated primary-plus-gallery sequence", () => {
  assert.match(detail, /const galleryImages = uniqueProductGalleryImages\(product\.image, product\.galleryImages, product\.name\);/);
  assert.match(detail, /galleryImages\.map\(\(image, index\) =>/);
});

test("hero sequence chooses distinct usable catalog image URLs", () => {
  assert.match(storefront, /uniqueProductsByImage\(catalog\.products\)\.slice\(0, 4\)/);
  assert.match(storefront, /normalizedProductImageUrl/);
});
