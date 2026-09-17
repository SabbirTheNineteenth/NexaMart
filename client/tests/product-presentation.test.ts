import assert from "node:assert/strict";
import test from "node:test";
import { buildProductPresentation, imageSourceFor, productImageSource } from "../src/features/catalog/product-presentation";

test("buildProductPresentation surfaces supplied brand and product craft details", () => {
  const presentation = buildProductPresentation({
    category: "Home",
    description: "Hand-spun aluminum shade with a warm, focused glow.",
    colors: ["Bone", "Ink"],
    brand: "Audo Atelier",
  });

  assert.deepEqual(presentation, {
    brand: "Audo Atelier",
    category: "Home",
    description: "Hand-spun aluminum shade with a warm, focused glow.",
    specification: "Bone + Ink",
  });
});

test("buildProductPresentation gracefully omits absent optional details", () => {
  const presentation = buildProductPresentation({
    category: "Home",
    description: "",
    colors: [],
  });

  assert.deepEqual(presentation, {
    brand: undefined,
    category: "Home",
    description: undefined,
    specification: undefined,
  });
});

test("imageSourceFor only accepts safe remote image URLs", () => {
  assert.equal(imageSourceFor("https://images.unsplash.com/photo-1"), "https://images.unsplash.com/photo-1");
  assert.equal(imageSourceFor("  https://images.unsplash.com/photo-2  "), "https://images.unsplash.com/photo-2");
  assert.equal(imageSourceFor("http://images.unsplash.com/photo-3"), undefined);
  assert.equal(imageSourceFor("🎧"), undefined);
  assert.equal(imageSourceFor("javascript:alert(1)"), undefined);
});

test("productImageSource preserves a secure catalog photo and otherwise reports an unavailable image", () => {
  assert.equal(productImageSource("https://cdn.example.com/lamp.jpg", "p-lumen"), "https://cdn.example.com/lamp.jpg");
  assert.equal(productImageSource("💡", "p-lumen"), undefined);
  assert.equal(productImageSource("🎁", "unknown-product"), undefined);
});
