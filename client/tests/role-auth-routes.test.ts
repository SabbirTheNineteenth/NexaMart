import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const authPath = new URL("../src/features/auth/RoleAuth.tsx", import.meta.url);
const cssPath = new URL("../src/features/auth/RoleAuth.module.css", import.meta.url);
const auth = () => readFileSync(authPath, "utf8");
const css = () => readFileSync(cssPath, "utf8");

test("role authentication routes retain real customer, seller, and administrator entry points", () => {
  for (const route of ["../src/app/login/page.tsx", "../src/app/login/seller/page.tsx", "../src/app/login/admin/page.tsx", "../src/app/register/page.tsx", "../src/app/register/seller/page.tsx", "../src/app/register/admin/page.tsx"]) {
    assert.equal(existsSync(new URL(route, import.meta.url)), true, `${route} should exist`);
  }
  assert.match(auth(), /export type AuthRouteRole = "customer" \| "seller" \| "admin"/);
  assert.match(auth(), /postJSON<\{ account: Account \}>\("\/auth\/login", \{ email, password \}\)/);
  assert.match(auth(), /if \(account\.role !== role\)[\s\S]*?return;/);
  assert.match(auth(), /router\.replace\(destination\)/);
});

test("wrong-role sign-in feedback provides the matching real role route", () => {
  const source = auth();

  assert.match(source, /const \[wrongRole, setWrongRole\] = useState<AuthRouteRole \| null>\(null\);/);
  assert.match(source, /setWrongRole\(account\.role\);/);
  assert.match(source, /\{wrongRole && <Link className="role-auth-recovery-link" href=\{roleRoute\("login", wrongRole\)\}>Continue to \{roleNames\[wrongRole\]\} sign in<\/Link>\}/);
});

test("RoleAuth owns the reference-matched split composition instead of global auth styling", () => {
  const source = auth();
  const styles = css();

  assert.match(source, /import styles from "\.\/RoleAuth\.module\.css"/);
  assert.match(source, /<aside className="role-auth-context"/);
  assert.match(source, /<div className="role-auth-media">[\s\S]*?<Image className=\{`role-auth-photo/);
  assert.match(source, /<section className="role-auth-panel"/);
  assert.match(source, /<nav className="role-auth-tabs" aria-label="Choose account role">/);
  assert.match(styles, /\.shell :global\(\.role-auth-layout\)\{[^}]*grid-template-columns:minmax\(0,1\.12fr\) minmax\(360px,\.88fr\)/);
  assert.match(styles, /\.shell :global\(\.role-auth-context-content\)\{[^}]*padding:clamp\(28px,4\.2vw,52px\)/);
  assert.match(styles, /\.shell :global\(\.role-auth-media\)\{[^}]*position:absolute[^}]*inset:0/);
  assert.match(styles, /\.shell :global\(\.role-auth-panel\)\{[^}]*background:rgba\(20,14,38,\.86\)/);
  assert.match(styles, /\.shell :global\(\.role-auth-panel-content\)\{[^}]*width:min\(100%,400px\)/);
  assert.match(styles, /\.shell :global\(\.role-auth-panel form\)\{[^}]*gap:14px/);
});

test("RoleAuth keeps a compact three-role selector, local editorial imagery, and a mobile single-column fallback", () => {
  const source = auth();
  const styles = css();

  assert.match(source, /aria-current=\{tab\.role === role \? "page" : undefined\}/);
  assert.match(source, /<BrandLogo monogram className="role-auth-monogram" priority \/>/);
  for (const asset of ["customer-panel.png", "seller-panel.png", "admin-panel.png"]) {
    assert.equal(existsSync(new URL(`../public/auth/${asset}`, import.meta.url)), true, `${asset} should be local`);
  }
  assert.match(styles, /\.shell :global\(\.role-auth-tabs\)\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.role-auth-layout\)\{[^}]*grid-template-columns:1fr/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.role-auth-context\)\{[^}]*min-height:clamp\(250px,56vw,340px\)/);
});

test("RoleAuth uses the bounded panel-04 editorial/form composition with a compact role-card hierarchy", () => {
  const source = auth();
  const styles = css();

  assert.match(source, /<main className="role-auth-shell" data-role=\{role\}>/);
  assert.match(source, /<aside className="role-auth-context"[\s\S]*?<div className="role-auth-editorial">/);
  assert.match(source, /<p className="role-auth-vertical-tagline" aria-hidden="true">\{sharedAuthReference\.closingLine\}<\/p>/);
  assert.match(source, /<BrandLogo monogram className="role-auth-monogram" priority \/>/);
  assert.match(source, /<nav className="role-auth-tabs" aria-label="Choose account role">/);
  assert.match(styles, /\.shell :global\(\.role-auth-layout\)\{[^}]*grid-template-columns:minmax\(0,1\.12fr\) minmax\(360px,\.88fr\)/);
  assert.match(styles, /\.shell :global\(\.role-auth-tabs a\)\{[^}]*min-height:58px/);
  assert.match(styles, /\.shell :global\(\.role-auth-tabs a\)\{[^}]*min-width:0[^}]*overflow-wrap:anywhere/);
  assert.match(styles, /\.shell :global\(\.role-auth-panel input\),\.shell :global\(\.role-auth-panel textarea\)\{[^}]*box-sizing:border-box[^}]*max-width:100%/);
  assert.match(styles, /\.shell :global\(\.role-auth-vertical-tagline\)\{[^}]*writing-mode:vertical-rl/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*?\.role-auth-layout\)\{[^}]*grid-template-columns:1fr[^}]*grid-template-areas:"form" "editorial"/);
});

test("role auth preserves loading, error, success, focus, and reduced-motion states", () => {
  const source = auth();
  const styles = css();

  assert.match(source, /aria-busy=\{saving\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /role="status"/);
  assert.match(source, /disabled=\{saving\}/);
  assert.match(styles, /\.shell :global\(\.role-auth-panel input:focus-visible\),\.shell :global\(\.role-auth-panel textarea:focus-visible\)\{[^}]*outline:/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.shell \*,\.shell \*::before,\.shell \*::after\{animation:none!important;transition:none!important/);
});

test("seller registration remains a customer account plus a real seller application", () => {
  const source = auth();
  assert.match(source, /postJSON<\{ account: Account \}>\("\/auth\/register", \{ name, email, password \}\)/);
  assert.match(source, /postJSON\("\/seller\/application", sellerApplication\)/);
  assert.match(source, /Seller access starts only after an administrator approves your application\./);
  assert.match(source, /Your customer account was created, but your seller application could not be submitted\./);
  assert.doesNotMatch(source, /postJSON[^\n]*role:\s*["']seller["']/);
});

test("administrator registration is provisioning-only and auth does not offer social sign-in", () => {
  const source = auth();
  assert.match(source, /if \(isAdminRegistration\) return/);
  assert.match(source, /Admin accounts are not self-registered\./);
  assert.match(source, /Ask a local NexaMart administrator to provision an admin account for you\./);
  assert.doesNotMatch(source, /postJSON[^\n]*admin/);
  assert.doesNotMatch(source, /(google|github|facebook|apple|social|continue with)/i);
});
