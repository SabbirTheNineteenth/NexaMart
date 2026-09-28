import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("VISUAL-7/01 establishes one global Obsidian Orchid foundation", () => {
  assert.match(styles, /\/\* VISUAL-7\/01 global foundations \*\//);
  assert.match(styles, /--brand-paper:var\(--orchid-obsidian\)/);
  assert.match(styles, /--brand-surface:var\(--orchid-plum\)/);
  assert.match(styles, /--brand-line:var\(--orchid-border\)/);
  assert.match(styles, /--brand-radius:var\(--orchid-radius\)/);
  assert.match(styles, /--brand-motion-fast:var\(--orchid-motion-fast\)/);
  assert.match(styles, /--brand-motion:var\(--orchid-motion\)/);
  assert.match(styles, /body\{[^}]*background:var\(--brand-paper\)[^}]*color:var\(--brand-ink\)[^}]*line-height:1\.5/);
  assert.match(styles, /color-scheme:dark/);
});

test("VISUAL-7/01 keeps global focus, motion, and narrow-screen foundations accessible", () => {
  assert.match(styles, /:where\(a,button,input,select,textarea,\[tabindex\]\):focus-visible\{outline:3px solid var\(--orchid-focus\);outline-offset:3px/);
  assert.match(styles, /:is\(a,button,input,select,textarea,\[tabindex\]\):focus-visible\{outline:3px solid var\(--orchid-focus\);outline-offset:3px/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{html\{scroll-behavior:auto\}[^}]*\}/);
  assert.match(styles, /@media\(max-width:480px\)\{html\{font-size:15px\}\}/);
  assert.doesNotMatch(styles, /body\{min-width:320px/);
  assert.match(styles, /:where\(button,input,select,textarea\)\{font:inherit\}/);
});
