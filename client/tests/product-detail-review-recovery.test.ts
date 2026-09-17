import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");

test("product detail does not present unsupported review information", () => {
  assert.doesNotMatch(detail, /\/reviews\/product|Customer reviews|reviewLoad|product\.rating|product\.reviews/);
});

test("product detail ignores stale detail completions after slug navigation", () => {
  assert.match(detail, /const requestTokenRef = useRef\(0\)/);
  assert.match(detail, /const requestToken = \+\+requestTokenRef\.current/);
  assert.match(detail, /requestTokenRef\.current === requestToken/);
});
