import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

test("seller dashboard loads and displays owned product reviews read-only", () => {
  assert.match(dashboard, /getJSON<\{ reviews: SellerReview\[\] \}>\("\/seller\/reviews", controller\.signal\)/);
  assert.match(dashboard, /<section className="seller-reviews" aria-labelledby="seller-reviews-heading">/);
  assert.match(dashboard, /<h2 id="seller-reviews-heading">Customer reviews<\/h2>/);
  assert.match(dashboard, /Loading customer reviews…/);
  assert.match(dashboard, /Unable to load customer reviews\. Refresh the page to try again\./);
  assert.match(dashboard, /No customer reviews for your products yet\./);
  assert.match(dashboard, /reviews\.map\(\(review\)/);
  assert.match(dashboard, /review\.product\.name/);
  assert.match(dashboard, /review\.rating\}\/5/);
  assert.match(dashboard, /review\.body/);
  assert.match(dashboard, /dateTime=\{review\.createdAt\}/);
  assert.match(dashboard, /review\.isVisible \? "Visible" : "Hidden"/);
  assert.doesNotMatch(dashboard, /\/seller\/reviews\/\$\{review\.id\}/);
  assert.match(sellerTypes, /export type SellerReview =/);
  assert.match(sellerTypes, /rating: number;/);
  assert.match(sellerTypes, /body: string \| null;/);
  assert.match(sellerTypes, /isVisible: boolean;/);
  assert.match(sellerTypes, /product: \{ id: string; name: string \};/);
});
