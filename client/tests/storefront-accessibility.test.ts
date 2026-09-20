import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("shopping bag drawer closes when Escape is pressed", () => {
  assert.match(storefront, /onKeyDown=\{handleDrawerKeyDown\}/);
  assert.match(storefront, /if \(event\.key === "Escape"\) \{/);
  assert.match(storefront, /closeCart\(\);\r?\n      return;/);
});

test("shopping bag drawer focuses its close control and restores the opener", () => {
  assert.match(storefront, /if \(cartOpen\) closeButtonRef\.current\?\.focus\(\);/);
  assert.match(storefront, /requestAnimationFrame\(\(\) => cartOpenerRef\.current\?\.focus\(\)\);/);
  assert.match(storefront, /<button className="drawer-backdrop" type="button" aria-label="Close shopping bag" onClick=\{closeCart\} \/>/);
});

test("shopping bag drawer traps Tab and Shift+Tab within the active dialog", () => {
  assert.match(storefront, /if \(event\.key !== "Tab"\) return;/);
  assert.match(storefront, /event\.preventDefault\(\);/);
  assert.match(storefront, /focusable\[focusable\.length - 1\]\?\.focus\(\);/);
  assert.match(storefront, /focusable\[0\]\?\.focus\(\);/);
});

test("catalog filters expose selection state and keyboard users can reveal quick add", () => {
  assert.match(storefront, /className="department-rail" role="group" aria-label="Browse departments"/);
  assert.match(storefront, /aria-pressed=\{!category\}/);
  assert.match(storefront, /aria-pressed=\{category === item\.name\}/);
  assert.match(storefront, /<select aria-label="Subcategory"[\s\S]*disabled=\{!category\}/);
  assert.match(styles, /\.product-card:focus-within \.quick-add \{ transform:translateY\(0\); \}/);
});

test("storefront controls have visible keyboard focus indicators", () => {
  assert.match(styles, /\.orchid-explore :is\(a,button,input,select\):focus-visible\{outline-color:var\(--orchid-violet\)\}/);
});

test("the first storefront focus target skips navigation to the programmatically focusable collection heading", () => {
  assert.match(storefront, /return <main className="storefront customer-experience orchid-explore reference-explore-layout" aria-labelledby="explore-heading">\r?\n    <a className="storefront-skip-link" href="#collection-heading" onClick=\{skipToCollection\}>Skip to collection<\/a>/);
  assert.match(storefront, /const skipToCollection = \(event: MouseEvent<HTMLAnchorElement>\) => \{\r?\n    event\.preventDefault\(\);\r?\n    collectionHeadingRef\.current\?\.focus\(\);\r?\n  \};/);
  assert.match(storefront, /<h2 id="collection-heading" ref=\{collectionHeadingRef\} tabIndex=\{-1\}>Browse catalog products\.<\/h2>/);
  assert.match(styles, /\.storefront-skip-link\{position:absolute;z-index:30;top:-64px/);
  assert.match(styles, /\.storefront-skip-link:focus\{top:16px\}/);
});
