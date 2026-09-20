import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(new URL("../src/features/catalog/ProductDetail.tsx", import.meta.url), "utf8");

test("C06 scopes a public product-load error to the slug that produced it", () => {
  assert.match(detail, /const \[errorSlug, setErrorSlug\] = useState\(""\);/);
  assert.match(detail, /setErrorSlug\(slug\);/);
  assert.match(detail, /const activeError = errorSlug === slug \? error : "";/);
  assert.match(detail, /if \(activeError\) return <main className="product-detail-shell orchid-explore">/);
  assert.match(detail, /<p>\{activeError\}<\/p>/);
});
