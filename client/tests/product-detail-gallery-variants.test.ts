import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url);
const catalogTypes = new URL("../src/types/catalog.ts", import.meta.url);
const styles = new URL("../src/app/globals.css", import.meta.url);

test("product detail presents an accessible selectable gallery from catalog gallery images", () => {
  const source = readFileSync(detail, "utf8");
  const types = readFileSync(catalogTypes, "utf8");

  assert.match(types, /galleryImages:\s*ProductGalleryImage\[\]/);
  assert.match(source, /const galleryImages = uniqueProductGalleryImages\(product\.image, product\.galleryImages, product\.name\);/);
  assert.match(source, /const \[selectedImage, setSelectedImage\] = useState\(0\)/);
  assert.match(source, /<div className="product-gallery" aria-label="Product images">/);
  assert.match(source, /<button[^>]*aria-label=\{`View image \$\{index \+ 1\}: \$\{image\.altText \?\? product\.name\}`\}[^>]*aria-pressed=\{selectedImage === index\}/);
  assert.match(source, /onClick=\{\(\) => \{ setGalleryImageFailed\(false\); setSelectedImage\(index\); \}\}/);
  assert.match(source, /const currentImageSource = productImageSource\(currentImage\?\.imageUrl, product\.id\);/);
  assert.match(source, /src=\{currentImageSource\}/);
  const css = readFileSync(styles, "utf8");
  assert.match(css, /\.product-gallery-thumbnails\{[^}]*display:flex/);
  assert.match(css, /\.product-gallery-thumbnails button\.is-selected/);
});

test("product detail exposes purchasable public variant IDs and lets customers select an in-stock variant", () => {
  const source = readFileSync(detail, "utf8");
  const types = readFileSync(catalogTypes, "utf8");

  assert.match(types, /variants:\s*ProductVariant\[\]/);
  assert.match(source, /<section className=\{`product-variants \$\{styles\.variantPanel\}`\} aria-labelledby="variant-availability-heading">/);
  assert.match(source, /<h2 id="variant-availability-heading">Available variants<\/h2>/);
  assert.match(types, /id: string;\s*sku: string;/);
  assert.match(source, /const \[selectedVariantId, setSelectedVariantId\] = useState<string \| null>\(null\)/);
  assert.match(source, /const selectedVariant = product\.variants\.find\(\(variant\) => variant\.id === selectedVariantId\) \?\? null/);
  assert.match(source, /product\.variants\.map\(\(variant\) =>/);
  assert.match(source, /Object\.entries\(variant\.options\)/);
  assert.match(source, /money\.format\(variant\.price\)/);
  assert.match(source, /onClick=\{\(\) => setSelectedVariantId\(variant\.id\)\}/);
  assert.match(source, /await cart\.add\(product, selectedVariant \? \{ id: selectedVariant\.id, price: selectedVariant\.price \} : undefined\)/);
});

test("base products remain purchasable while selected variants use their own stock", () => {
  const source = readFileSync(detail, "utf8");
  assert.match(source, /const purchasable = selectedVariant \? selectedVariant\.stock > 0 : product\.inStock/);
  assert.match(source, /product = \{ \.\.\.product, inStock: purchasable \};/);
  assert.match(source, /This product or selected variant is no longer available\. Choose an in-stock variant and try again\./);
});
