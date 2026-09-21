import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/ProductDetail.module.css", import.meta.url), "utf8");

test("product detail gives real catalog media an inspectable hierarchy without inventing commerce claims", () => {
  assert.match(detail, /<figure className=\{styles\.mediaFrame\}>/);
  assert.match(detail, /<figcaption className=\{styles\.mediaCaption\}>/);
  assert.match(detail, /Image \{selectedImage \+ 1\} of \{galleryImages\.length\}/);
  assert.match(detail, /styles\.thumbnailList/);
  assert.doesNotMatch(detail, /Customer reviews|product\.rating|product\.reviews|Delivery|Free shipping/);
});

test("product detail makes availability, actions, and transient states readable in the compact inspect surface", () => {
  assert.match(detail, /className=\{styles\.availability\}/);
  assert.match(detail, /className=\{styles\.unavailableNote\}/);
  assert.match(detail, /styles\.loadingState/);
  assert.match(detail, /styles\.errorState/);
  assert.match(styles, /\.mediaFrame\{/);
  assert.match(styles, /\.thumbnailList\{/);
  assert.match(styles, /\.purchasePanel\{/);
  assert.match(styles, /min-height:44px/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.match(styles, /@media\(max-width:420px\)/);
});
