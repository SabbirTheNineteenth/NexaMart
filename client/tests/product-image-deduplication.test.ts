import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizedProductImageUrl, productImageIdentity, selectDepartmentProductsByImage, selectUniqueProductsByImage, uniqueProductGalleryImages } from "../src/features/catalog/product-presentation";

const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const presentation = readFileSync(new URL("../src/features/catalog/product-presentation.ts", import.meta.url), "utf8");

test("catalog presentation has stable URL and ordered gallery dedupe helpers", () => {
  assert.match(presentation, /export function normalizedProductImageUrl/);
  assert.match(presentation, /export function uniqueProductGalleryImages/);
});

test("gallery view keeps the primary first and removes normalized repeats while retaining distinct angles", () => {
  const gallery = uniqueProductGalleryImages("https://images.unsplash.com/photo-12345-abcdef?w=640#top", [
    { imageUrl: "https://IMAGES.unsplash.com/photo-12345-abcdef?fit=crop&w=1440", altText: "Duplicate", sortOrder: 0 },
    { imageUrl: "https://cdn.example.test/side.jpg?crop=wide", altText: "Side", sortOrder: 1 },
  ], "Primary");
  assert.deepEqual(gallery.map((image) => image.imageUrl), ["https://images.unsplash.com/photo-12345-abcdef?w=640#top", "https://cdn.example.test/side.jpg?crop=wide"]);
  assert.equal(normalizedProductImageUrl(" HTTPS://cdn.example.test/main.jpg#new "), "https://cdn.example.test/main.jpg");
});

test("product detail renders a de-duplicated primary-plus-gallery sequence", () => {
  assert.match(detail, /const galleryImages = uniqueProductGalleryImages\(product\.image, product\.galleryImages, product\.name\);/);
  assert.match(detail, /galleryImages\.map\(\(image, index\) =>/);
});

test("hero sequence chooses distinct usable catalog image URLs", () => {
  assert.match(storefront, /uniqueProductsByImage\(catalog\.products\)\.slice\(0, 4\)/);
  assert.match(storefront, /selectUniqueProductsByImage/);
});

test("stable media identity collapses transformed Unsplash URLs without collapsing distinct source media", () => {
  const samePhotoA = "https://images.unsplash.com/photo-12345-abcdef?fit=crop&w=640&q=75";
  const samePhotoB = "https://IMAGES.unsplash.com/photo-12345-abcdef?crop=entropy&w=1440&q=95#card";
  const differentPhoto = "https://images.unsplash.com/photo-98765-fedcba?fit=crop&w=640";
  assert.equal(productImageIdentity(samePhotoA), productImageIdentity(samePhotoB));
  assert.notEqual(productImageIdentity(samePhotoA), productImageIdentity(differentPhoto));
});

test("collection selection scans past duplicate media, preserves source order, and keeps only real eligible products", () => {
  const products = [
    { id: "one", image: "https://images.unsplash.com/photo-12345-abcdef?w=640", inStock: true, deal: true },
    { id: "two", image: "https://images.unsplash.com/photo-12345-abcdef?w=1440&q=95", inStock: true, deal: true },
    { id: "three", image: "https://images.unsplash.com/photo-98765-fedcba?w=640", inStock: true, deal: true },
    { id: "four", image: "https://images.unsplash.com/photo-54321-abcdef?w=640", inStock: true, deal: false },
  ];
  assert.deepEqual(selectUniqueProductsByImage(products.filter((product) => product.inStock), 3).map((product) => product.id), ["one", "three", "four"]);
  assert.deepEqual(selectUniqueProductsByImage(products.filter((product) => product.deal), 4).map((product) => product.id), ["one", "three"]);
});

test("department tiles never borrow another department product and use a truthful no-image result when media repeats", () => {
  const departments = [{ name: "Audio" }, { name: "Home" }];
  const tiles = selectDepartmentProductsByImage(departments, [
    { id: "audio", category: "Audio", image: "https://images.unsplash.com/photo-12345-abcdef?w=640" },
    { id: "home", category: "Home", image: "https://images.unsplash.com/photo-12345-abcdef?w=1440" },
  ]);
  assert.equal(tiles[0]?.product?.id, "audio");
  assert.equal(tiles[1]?.product, undefined);
});

test("Storefront applies stable-media selection to every product collection and its displayed grid count", () => {
  assert.match(storefront, /selectUniqueProductsByImage\(catalog\.products\.filter\(\(product\) => product\.inStock\), 6\)/);
  assert.match(storefront, /selectUniqueProductsByImage\(catalog\.products\.filter\(\(product\) => product\.effectivePrice/);
  assert.match(storefront, /selectUniqueProductsByImage\(newArrivals, 8\)/);
  assert.match(storefront, /selectUniqueProductsByImage\(referenceFacetProducts/);
  assert.doesNotMatch(storefront, /\?\? catalog\.products\[index\]/);
});
