import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("global smooth scrolling respects reduced-motion preferences", () => {
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{html\{scroll-behavior:auto\}\}/);
});
