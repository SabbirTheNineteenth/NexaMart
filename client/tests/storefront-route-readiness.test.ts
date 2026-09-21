import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const storefront = readFileSync(new URL("../src/features/catalog/Storefront.tsx", import.meta.url), "utf8");

test("the storefront route is request-rendered instead of shipping its whole UI as a Suspense fallback", () => {
  assert.match(page, /import \{ connection \} from "next\/server";/);
  assert.match(page, /export default async function HomePage\(\) \{\s*await connection\(\);\s*return <Storefront \/>;\s*\}/);
  assert.doesNotMatch(page, /Loading catalog/);
  assert.doesNotMatch(page, /<Suspense/);
});

test("a catalog request settles into either rendered results or an accessible retryable error", () => {
  assert.match(storefront, /setCatalog\(payload\);\s*setCatalogLoaded\(true\);/);
  assert.match(storefront, /if \(failure\) \{\s*setCatalogLoaded\(true\);\s*setError\(failure\.error\);\s*\}/);
  assert.match(storefront, /<div className="message" role="alert" aria-labelledby="catalog-error-heading">/);
  assert.match(storefront, /Retry catalog/);
});
