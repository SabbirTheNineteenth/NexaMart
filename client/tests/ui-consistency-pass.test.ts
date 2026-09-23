import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const storefront = source("features/catalog/Storefront.tsx");
const deals = source("features/catalog/DealsDiscovery.tsx");
const detail = source("features/catalog/ProductDetail.tsx");
const account = source("features/account/AccountWorkspace.tsx");
const seller = source("features/seller/SellerDashboard.tsx");
const admin = source("features/admin/AdminDashboard.tsx");
const auth = source("features/auth/RoleAuth.tsx");

test("the shared skeleton primitives are motion-safe and remain decorative", () => {
  const skeletonUrl = new URL("../src/components/ui/Skeleton.tsx", import.meta.url);
  const stylesUrl = new URL("../src/components/ui/Skeleton.module.css", import.meta.url);
  assert.ok(existsSync(skeletonUrl));
  assert.ok(existsSync(stylesUrl));
  const skeleton = readFileSync(skeletonUrl, "utf8");
  const styles = readFileSync(stylesUrl, "utf8");
  assert.match(skeleton, /export function SkeletonText/);
  assert.match(skeleton, /export function SkeletonCard/);
  assert.match(skeleton, /aria-hidden="true"/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /animation: none/);
});

test("real read-loading branches use the shared skeleton without replacing error or empty recovery", () => {
  for (const value of [storefront, deals, detail, account, seller, admin]) assert.match(value, /@\/components\/ui\/Skeleton/);
  assert.match(storefront, /<SkeletonCard/);
  assert.match(deals, /<SkeletonCard/);
  assert.match(detail, /<SkeletonCard/);
  assert.match(account, /<SkeletonCard/);
  assert.match(seller, /<SkeletonCard/);
  assert.match(admin, /<SkeletonTableRow/);
  assert.match(storefront, /Retry catalog/);
  assert.match(deals, /Retry active deals/);
  assert.match(detail, /Try again/);
});

test("visible NexaMart placements use the canonical monogram and readable wordmark", () => {
  for (const value of [storefront, detail, account, seller, admin, auth]) assert.match(value, /<BrandLogo monogram/);
  assert.match(deals, /<ExploreHeader active="deals"/);
  assert.match(seller, /<BrandLogo monogram className=\{styles\.sellerBrandMark\}/);
  assert.match(seller, /<span>NexaMart<\/span>/);
  assert.doesNotMatch(seller, /NEXA<span>•<\/span>MART/);
  assert.match(admin, /<span>NexaMart<\/span>/);
  assert.match(auth, /<span>NexaMart<\/span>/);
});

test("the Storefront footer exposes only live catalog, account, and bag destinations", () => {
  assert.match(storefront, /Discover products from the current NexaMart catalog\./);
  assert.match(storefront, /<h2>Explore<\/h2>/);
  assert.match(storefront, /<h2>Your account<\/h2>/);
  assert.match(storefront, /href="\/#collection"/);
  assert.match(storefront, /href="\/#departments"/);
  assert.match(storefront, /href="\/#new-arrivals-heading"/);
  assert.match(storefront, /href="\/deals"/);
  assert.match(storefront, /href="\/stores"/);
  assert.match(storefront, /openCart\(event\.currentTarget\)/);
  assert.doesNotMatch(storefront, /support@|privacy policy|terms of service|payment methods|free delivery|follow us/i);
});
