import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/features/catalog/Storefront.module.css", import.meta.url), "utf8");

test("Storefront contains narrow-width rails and keeps the brand-to-catalog handoff compact", () => {
  assert.match(styles, /:global\(\.storefront\)\s*\{\s*overflow-x: clip;/);
  assert.match(styles, /:global\(\.storefront \.marketplace-rail\),\s*:global\(\.storefront \.department-tile-rail\)\s*\{[\s\S]*?max-width: 100%;[\s\S]*?overflow-x: auto;[\s\S]*?overscroll-behavior-x: contain;/);
  assert.match(styles, /:global\(\.storefront \.brand-showcase\)\s*\{\s*padding-block: clamp\(1\.5rem, 4vw, 2\.5rem\);/);
  assert.match(styles, /:global\(\.storefront \.statement\)\s*\{\s*padding-block: clamp\(2\.5rem, 6vw, 4\.5rem\);/);
});
