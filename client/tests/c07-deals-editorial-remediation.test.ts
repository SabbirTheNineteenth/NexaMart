import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const deals = readFileSync(new URL("../src/features/catalog/DealsDiscovery.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/catalog/DealsDiscovery.module.css", import.meta.url), "utf8");

test("C07 gives authoritative active deals a compact editorial hierarchy and actionable recovery", () => {
  assert.match(deals, /styles\.hero/);
  assert.match(deals, /styles\.collection\}/);
  assert.match(deals, /styles\.stateFrame\}/);
  assert.match(deals, /className=\{styles\.retryButton\}/);
  assert.match(deals, /className=\{styles\.dealMeta\}>Active now<\//);
  assert.match(deals, /className=\{styles\.confirmation\}>Server-confirmed active deal<\//);
  assert.match(styles, /\.hero\s*\{[\s\S]*padding: clamp\(20px, 3vw, 34px\)/);
  assert.match(styles, /\.card\s*\{[\s\S]*transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(styles, /@media \(max-width: 700px\)/);
  assert.match(styles, /@media \(max-width: 420px\)/);
});
