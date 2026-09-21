import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/Storefront.module.css", import.meta.url), "utf8");

test("shopping bag drawer is a labelled modal with a focus trap, Escape close, and opener restoration", () => {
  assert.match(storefront, /role="dialog" aria-modal="true" aria-labelledby="shopping-bag-title"/);
  assert.match(storefront, /onKeyDown=\{handleDrawerKeyDown\}/);
  assert.match(storefront, /if \(event\.key === "Escape"\) \{/);
  assert.match(storefront, /const focusable = panel \? Array\.from\(panel\.querySelectorAll<HTMLElement>\(/);
  assert.match(storefront, /cartOpenerRef\.current\?\.focus\(\)/);
  assert.match(storefront, /className="drawer-backdrop" type="button" aria-label="Close shopping bag" onClick=\{closeCart\}/);
});

test("shopping bag drawer provides clear pending, retry, and empty states without fulfillment promises", () => {
  assert.match(storefront, /Loading your bag…/);
  assert.match(storefront, /Retry loading bag/);
  assert.match(storefront, /Updating…/);
  assert.match(storefront, /Removing…/);
  assert.match(storefront, /Your bag is empty\./);
  assert.doesNotMatch(storefront, /(?:Free delivery|Guaranteed delivery|Secure payment|Payment protected)/i);
});

test("shopping bag drawer has local containment, 44px controls, narrow viewport treatment, and reduced motion", () => {
  assert.match(styles, /:global\(\.storefront \.drawer-panel\) \{[\s\S]*max-width: min\(100%, 30rem\);/);
  assert.match(styles, /:global\(\.storefront \.drawer-panel\) \{[\s\S]*overscroll-behavior: contain;/);
  assert.match(styles, /:global\(\.storefront \.drawer button\)[\s\S]*min-height: 44px;/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
  assert.match(styles, /@media \(max-width: 390px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
