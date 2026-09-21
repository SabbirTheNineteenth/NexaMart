import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("mobile marketplace navigation keeps categories, Account, and an announced keyboard-dismissable menu", () => {
  assert.match(storefront, /const \[mobileNavOpen, setMobileNavOpen\] = useState\(false\);/);
  assert.match(storefront, /aria-label="Toggle marketplace categories"/);
  assert.match(storefront, /aria-expanded=\{mobileNavOpen\}/);
  assert.match(storefront, /aria-controls="marketplace-category-navigation"/);
  assert.match(storefront, /id="marketplace-category-navigation"/);
  assert.match(storefront, /aria-label="Marketplace categories"/);
  assert.match(storefront, /aria-label="Browse all departments"/);
  assert.match(storefront, /href="#catalog-information"/); assert.match(storefront, />Catalog information<\/a>/);
  assert.match(storefront, /href="\/account"/); assert.match(storefront, />Account<\/a>/);
  assert.match(storefront, /if \(event\.key === "Escape"\) \{\r?\n      closeMobileNav\(\);/);
  assert.match(storefront, /mobileNavToggleRef\.current\?\.focus\(\)/);
  assert.match(styles, /\.marketplace-category-nav\{display:none/);
  assert.match(styles, /\.marketplace-category-nav\.is-open\{display:block/);
});

test("Escape from the marketplace navigation toggle or a category link closes the menu and restores toggle focus", () => {
  assert.match(storefront, /<header id="top" className="marketplace-header" onKeyDown=\{handleMobileNavKeyDown\}>/);
  assert.match(storefront, /if \(event\.key === "Escape"\) \{\r?\n      closeMobileNav\(\);\r?\n    \}/);
  assert.match(storefront, /const closeMobileNav = \(\) => \{\r?\n    setMobileNavOpen\(false\);\r?\n    requestAnimationFrame\(\(\) => mobileNavToggleRef\.current\?\.focus\(\)\);\r?\n  \};/);
});

test("product detail links successful bag adds to the existing checkout drawer route", () => {
  const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
  assert.match(detail, /cartAdd\?\.state === "success" && <p className="cart-add-feedback success" role="status">Added to bag\. <Link href="\/\?bag=1">View bag and checkout<\/Link><\/p>/);
  assert.match(storefront, /new URLSearchParams\(window\.location\.search\)\.get\("bag"\) === "1"/);
  assert.match(storefront, /aria-label="Shopping bag"/);
});

test("product detail failure has a disabled pending retry that refetches without a page reload", () => {
  const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
  assert.match(detail, /const \[detailReloadNonce, setDetailReloadNonce\] = useState\(0\);/);
  assert.match(detail, /\}, \[detailReloadNonce, slug\]\);/);
  assert.match(detail, /setDetailReloadNonce\(\(value\) => value \+ 1\)/);
  assert.match(detail, /Retrying product(?:\u2026|\\u2026)/);
  assert.match(detail, /aria-busy=\{detailRetryPending\}/);
});

test("product gallery validates remote media and retains an identified fallback after load failure", () => {
  const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");
  assert.match(detail, /import \{ (?:flashOfferPresentation, )?productImageSource \} from "@\/features\/catalog\/product-presentation"/);
  assert.match(detail, /const \[galleryImageFailed, setGalleryImageFailed\] = useState\(false\);/);
  assert.match(detail, /productImageSource\(currentImage\?\.imageUrl, product\.id\)/);
  assert.match(detail, /onError=\{\(\) => setGalleryImageFailed\(true\)\}/);
  assert.match(detail, /aria-label=\{`\$\{product\.name\} product image unavailable`\}/);
});
