import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const brand = readFileSync(new URL("../src/components/BrandLogo.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../src/components/OrchidShell.tsx", import.meta.url), "utf8");

test("UI-01 provides opt-in Obsidian Orchid semantic tokens and shared shell primitives", () => {
  for (const token of ["--orchid-obsidian:#15111b", "--orchid-plum:#24172e", "--orchid-surface:#2d2039", "--orchid-violet:#8057e8", "--orchid-text:#fbf7f0", "--orchid-border:#5a4868"]) {
    assert.match(styles, new RegExp(token.replace(/[--]/g, "\\$&")));
  }
  assert.match(styles, /\.orchid-shell\{/);
  assert.match(styles, /\.orchid-shell--operate\{/);
  assert.match(shell, /orchid-shell--\$\{tone\}/);
  assert.match(shell, /<nav className="orchid-navigation" aria-label=\{navigationLabel\}>/);
});

test("UI-01 keeps motion and keyboard focus shared and respects reduced motion", () => {
  assert.match(styles, /:where\(a,button,input,select,textarea,\[tabindex\]\):focus-visible\{outline:3px solid var\(--orchid-focus\)/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*\.orchid-shell \*\{animation-duration:0\.01ms!important;transition-duration:0\.01ms!important/);
});

test("UI-01 preserves the original NexaMart monogram as the shared brand mark", () => {
  assert.match(brand, /src="\/brand\/nexamart-monogram-v1\.png"/);
  assert.doesNotMatch(brand, /linear-gradient/);
});
