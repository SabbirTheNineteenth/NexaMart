import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");
const account = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("customer Explore and account surfaces retain their named responsive landmarks and checkout controls", () => {
  assert.match(storefront, /<main className="storefront customer-experience orchid-explore reference-explore-layout" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<a className="storefront-skip-link" href="#collection-heading" onClick=\{skipToCollection\}>Skip to collection<\/a>/);
  assert.match(storefront, /<header id="top" className="marketplace-header" onKeyDown=\{handleMobileNavKeyDown\}>/);
  assert.match(storefront, /<nav id="marketplace-category-navigation" className=\{`marketplace-category-nav \$\{mobileNavOpen \? "is-open" : ""\}`\} aria-label="Marketplace categories">/);
  assert.match(storefront, /<section className="marketplace-hero reference-collection-hero" aria-labelledby="explore-heading">/);
  assert.match(storefront, /<h1 id="explore-heading">Browse <em>catalog products\.<\/em><\/h1>/);
  assert.match(storefront, /<section id="collection" className="collection shell customer-collection reference-explore-content">/);
  assert.match(storefront, /<h2 id="collection-heading" ref=\{collectionHeadingRef\} tabIndex=\{-1\}>Browse catalog products\.<\/h2>/);
  assert.match(account, /<main className=\{`account-shell customer-account-workspace \$\{styles\.shell\}`\}>/);
  assert.match(account, /<header className="seller-topbar customer-account-topbar">/);
  assert.match(account, /<nav className="orchid-navigation account-section-navigation" aria-label="Account sections">/);
  assert.match(account, /account\.role === "customer" && <a href="#reviews">Reviews<\/a>/);
  assert.match(account, /<section className="trust account-data-summary" aria-label="Account overview">/);
  assert.match(styles, /\.customer-experience\{/);
  assert.match(styles, /\.orchid-explore\{/);
  assert.match(styles, /\.marketplace-header\{/);
  assert.match(styles, /\.customer-account-workspace\{/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*\.customer-experience/s);
  assert.match(storefront, /aria-label="Open shopping bag"/);
  assert.match(storefront, /<legend>Shipping address<\/legend>/);
  assert.match(account, /aria-label=\{`Edit shipping address for \$\{address\.recipientName\}`\}/);
});
