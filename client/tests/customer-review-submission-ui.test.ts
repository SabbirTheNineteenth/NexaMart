import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const accountTypes = readFileSync(new URL("../src/types/account.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("customer account loads customer-only eligible purchases into a named reviews landmark", () => {
  assert.match(workspace, /getJSON<\{ items: CustomerReviewEligibility\[\] \}>\("\/reviews\/eligible"/);
  assert.match(workspace, /<section id="reviews" className="customer-reviews" aria-labelledby="customer-reviews-heading">/);
  assert.match(workspace, /<h2 id="customer-reviews-heading">Review delivered purchases<\/h2>/);
  assert.match(workspace, /Loading delivered purchases…/);
  assert.match(workspace, /Unable to load delivered purchases/);
  assert.match(workspace, /No delivered purchases are waiting for a review\./);
  assert.match(accountTypes, /export type CustomerReviewEligibility =/);
  assert.match(accountTypes, /product: \{ id: string; name: string; image: string \| null \}/);
  assert.match(styles, /\.customer-reviews/);
});

test("customer can retry only eligible-review loading after an error without duplicate requests", () => {
  assert.match(workspace, /const reviewLoadInFlight = useRef\(false\);/);
  assert.match(workspace, /const loadEligibleReviews = useCallback\(async \(\) => \{/);
  assert.match(workspace, /if \(reviewLoadInFlight\.current\) return;/);
  assert.match(workspace, /reviewLoadInFlight\.current = true;/);
  assert.match(workspace, /finally \{\s*reviewLoadInFlight\.current = false;\s*\}/);
  assert.match(workspace, /aria-label="Retry loading delivered purchases"/);
  assert.match(workspace, /onClick=\{\(\) => void loadEligibleReviews\(\)\}/);
  assert.match(workspace, /Retry loading delivered purchases/);
  assert.match(workspace, /reviews\.state === "loading" \? <p className="seller-state" aria-live="polite">Loading delivered purchases…<\/p> : reviews\.state === "error" \? <div role="alert">/);
  assert.doesNotMatch(workspace, /loadEligibleReviews[\s\S]{0,700}set(?:Account|Orders|Addresses|Wishlist|ReviewSubmissions|ReviewSuccess)\(/);
});

test("customer review form submits only the eligible product and order item identifiers with review content", () => {
  assert.match(workspace, /postJSON\("\/reviews\/", \{ productId: item\.product\.id, orderItemId: item\.orderItem\.id, rating, title, body \}\)/);
  assert.doesNotMatch(workspace, /postJSON\("\/reviews\/", \{[^}]*\b(?:customerId|orderId|accountId|owner)/);
  assert.match(workspace, /name="rating"/);
  assert.match(workspace, /name="title"/);
  assert.match(workspace, /name="body"/);
  assert.match(workspace, /Submitting review…/);
  assert.match(workspace, /Review submitted\./);
  assert.match(workspace, /Unable to submit review/);
});
