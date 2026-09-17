import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const brandLogo = readFileSync(new URL("../src/components/BrandLogo.tsx", import.meta.url), "utf8");
const exploreHeader = readFileSync(new URL("../src/components/ExploreHeader.tsx", import.meta.url), "utf8");

test("THEME-01 isolates historical styles and gives NexaMart one explicit canonical theme layer", () => {
  assert.match(styles, /@layer legacy, nexamart-theme;/);
  assert.match(styles, /@layer legacy \{/);
  assert.match(styles, /@layer nexamart-theme \{/);
  assert.match(styles, /--nx-surface-base:/);
  assert.match(styles, /--brand-primary:var\(--nx-violet\)/);
  assert.match(styles, /\.orchid-explore,\.customer-account-workspace,\.seller-workspace,\.admin-workspace,\.role-auth-shell/);
});

test("THEME-01 keeps the approved NexaMart image mark visible at header scale", () => {
  assert.match(styles, /\.marketplace-brand-mark\{width:30px;height:30px/);
  assert.match(styles, /\.nexamart-logo\{display:block/);
});

test("THEME-01 crops the approved combined brand image to a readable header monogram", () => {
  assert.match(brandLogo, /monogram\?: boolean/);
  assert.match(brandLogo, /src="\/brand\/nexamart-monogram-v1\.png"/);
  assert.match(brandLogo, /nexamart-monogram-image/);
  assert.match(exploreHeader, /<BrandLogo monogram className="marketplace-brand-mark" priority \/>/);
  assert.match(styles, /\.nexamart-monogram\{[^}]*overflow:hidden/);
  assert.match(styles, /\.nexamart-monogram-image\{[^}]*max-width:none/);
});

test("THEME-01 keeps role-auth headings inside the mobile panel", () => {
  assert.match(styles, /\.role-auth-panel h1\{max-width:none;min-width:0;overflow-wrap:normal/);
});
