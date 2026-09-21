import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");

const reviewFeed = () => {
  const start = dashboard.indexOf("const loadReviews = useCallback");
  const callbackEnd = "\n  }, []);";
  const end = dashboard.indexOf(callbackEnd, start);
  assert.notEqual(start, -1, "loadReviews is defined");
  assert.notEqual(end, -1, "loadReviews has its useCallback terminator");
  return dashboard.slice(start, end + callbackEnd.length);
};

test("admin review retry reloads only reviews, clears only the feed error, and prevents duplicate pending requests", () => {
  const reviews = reviewFeed();
  assert.match(reviews, /if \(reviewRequestPending\.current\) return;/);
  assert.match(reviews, /setReviewLoadError\(""\);/);
  assert.match(reviews, /getJSON<\{ reviews: AdminReview\[\] \}>\("\/admin\/reviews", controller\.signal\)/);
  assert.match(reviews, /setData\(\(current\) => \(\{ \.\.\.current, reviews: reviewFeed\.reviews \}\)\)/);
  assert.doesNotMatch(reviews, /setReviewError|setFailedVisibilityChange|\/admin\/(accounts|audits|orders|products|promotions|sellers|finance|analytics)/);
  assert.match(reviews, /if \(!controller\.signal\.aborted\) setReviewLoading\(false\);/);
  assert.match(dashboard, /aria-label="Retry customer reviews"/);
  assert.match(dashboard, /onClick=\{loadReviews\}/);
  assert.match(dashboard, /disabled=\{reviewLoading\}/);
  assert.match(dashboard, /reviewRequestController\.current\?\.abort\(\)/);
});

test("review feed failure is separate from review visibility mutation failures", () => {
  assert.match(dashboard, /const \[reviewLoadError, setReviewLoadError\] = useState\(""\);/);
  assert.match(dashboard, /reviewLoadError \? <div className="admin-empty" role="alert">/);
  assert.match(dashboard, /reviewError && <div className="admin-review-error" role="alert">/);
});
