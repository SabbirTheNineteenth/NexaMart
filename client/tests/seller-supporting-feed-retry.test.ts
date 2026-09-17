import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

const supportingFeed = (name: "Reviews" | "Analytics") => {
  const start = dashboard.indexOf(`const load${name} = useCallback`);
  const end = dashboard.indexOf(name === "Reviews" ? "\n\n  const loadAnalytics" : "\n\n  const loadWorkspace", start);
  assert.notEqual(start, -1, `load${name} is defined`);
  assert.notEqual(end, -1, `load${name} ends before the next declaration`);
  return dashboard.slice(start, end);
};

test("seller review retry reloads only reviews and prevents duplicate pending requests", () => {
  const reviews = supportingFeed("Reviews");

  assert.match(reviews, /if \(reviewsRequestPending\.current\) return;/);
  assert.match(reviews, /getJSON<\{ reviews: SellerReview\[\] \}>\("\/seller\/reviews", controller\.signal\)/);
  assert.doesNotMatch(reviews, /\/seller\/(analytics|products|promotions|orders|finance|application)/);
  assert.match(dashboard, /aria-label="Retry customer reviews"/);
  assert.match(dashboard, /onClick=\{loadReviews\}/);
  assert.match(dashboard, /disabled=\{reviewsLoading\}/);
});

test("seller analytics retry reloads only analytics and prevents duplicate pending requests", () => {
  const analytics = supportingFeed("Analytics");

  assert.match(analytics, /if \(analyticsRequestPending\.current\) return;/);
  assert.match(analytics, /getJSON<\{ analytics: SellerAnalytics \}>\("\/seller\/analytics", controller\.signal\)/);
  assert.doesNotMatch(analytics, /\/seller\/(reviews|products|promotions|orders|finance|application)/);
  assert.match(dashboard, /aria-label="Retry operational analytics"/);
  assert.match(dashboard, /onClick=\{loadAnalytics\}/);
  assert.match(dashboard, /disabled=\{analyticsLoading\}/);
});
