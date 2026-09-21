import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/ProductDetail.module.css", import.meta.url), "utf8");

test("product detail keeps its dense gallery and purchase surface within every supported viewport", () => {
  assert.match(detail, /className=\{`product-variant-selector \$\{styles\.variantSelector\}`\}/);
  assert.match(detail, /className=\{styles\.variantList\}/);
  assert.match(styles, /\.layout\{[^}]*grid-template-columns:minmax\(0,1\.08fr\) minmax\(320px,\.92fr\)/);
  assert.match(styles, /\.media :global\(\.product-gallery-main\)\{[^}]*height:auto!important/);
  assert.match(styles, /\.variantSelector\{display:flex;flex-wrap:wrap;gap:7px/);
  assert.match(styles, /@media\(max-width:700px\)\{[\s\S]*\.layout\{grid-template-columns:1fr/);
  assert.match(styles, /@media\(max-width:420px\)\{[\s\S]*\.layout\{[^}]*padding:12px 0 28px/);
  assert.match(styles, /@media\(max-width:390px\)\{[\s\S]*\.purchasePanel :global\(\.product-detail-actions\)\{display:grid;grid-template-columns:minmax\(0,1fr\) 44px/);
});

test("product detail protects keyboard focus and motion-sensitive customers on its local controls", () => {
  assert.match(styles, /\.thumbnailList button:focus-visible,\.variantSelector button:focus-visible,/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*\.variantSelector button/);
});
