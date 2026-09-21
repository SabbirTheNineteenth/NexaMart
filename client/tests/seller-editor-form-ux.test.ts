import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (file: string) =>
  readFileSync(
    new URL(`../src/features/seller/${file}`, import.meta.url),
    "utf8",
  );

test("seller editor forms group fields and disable them while saving", () => {
  for (const file of [
    "SellerProductForm.tsx",
    "SellerProductEditor.tsx",
    "SellerPromotionForm.tsx",
    "SellerPromotionEditor.tsx",
  ]) {
    const editor = source(file);
    assert.match(editor, /<fieldset className="seller-form-group">/);
    assert.match(editor, /aria-busy=\{/);
    assert.match(editor, /<fieldset disabled=\{/);
  }
});

test("seller editor form styling provides scoped focus, narrow layout, and reduced-motion treatment", () => {
  const styles = source("SellerEditorForms.module.css");
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
