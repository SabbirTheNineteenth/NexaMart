import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../src/features/account/AccountWorkspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/features/account/AccountWorkspace.module.css", import.meta.url), "utf8");

test("customer workspace uses a bounded rail and collapses without fixed-width overflow", () => {
  assert.match(workspace, /className=\{styles\.workspaceLayout\}/);
  assert.match(styles, /\.workspaceLayout \{[^}]*grid-template-columns: 208px minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 900px\) \{[\s\S]*?\.workspaceLayout \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /\.shell, \.shell :global\(\*\) \{ box-sizing: border-box; \}/);
});

test("saved product cards give product details a readable column and keep media bounded", () => {
  assert.match(workspace, /className=\{styles\.wishlistMedia\}/);
  assert.match(styles, /\.wishlistMedia\s*\{[^}]*aspect-ratio:[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.wishlistMedia\s+:global\(\.wishlist-image\)\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover/s);
  assert.match(workspace, /className=\{styles\.wishlistDetails\}/);
  assert.match(styles, /\.wishlistDetails \{ display: grid; min-width: 0; gap: 8px; \}/);
  assert.match(styles, /\.content :global\(\.wishlist-action\) \{ min-width: 0; \}/);
});

test("address editor stays centered and address fields collapse to one column", () => {
  assert.match(styles, /\.addressEditorForm\s*\{[^}]*width:\s*min\(100%,\s*680px\);[^}]*margin-inline:\s*auto/s);
  assert.match(styles, /\.addressEditorForm\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(styles, /\.content :global\(\.account-address-editor form\),\.addressCreateForm \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.doesNotMatch(styles, /\.content\s+:global\(\.account-address-editor form\)\s*\{\s*width:\s*100%/);
  assert.match(styles, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.addressEditorForm[^}]*grid-template-columns:\s*1fr/);
});

test("account address mutations and the prior creation form reset remain intact", () => {
  assert.match(workspace, /addressCreateForm\.reset\(\); await loadAddresses\(\)/);
  assert.match(workspace, /postJSON<\{ address: ShippingAddress \}>\("\/addresses\/"/);
  assert.match(workspace, /patchJSON<\{ address: ShippingAddress \}>\(`\/addresses\/\$\{address\.id\}`/);
  assert.match(workspace, /patchJSON<\{ address: ShippingAddress \}>\(`\/addresses\/\$\{address\.id\}\/default`/);
  assert.match(workspace, /deleteJSON<void>\(`\/addresses\/\$\{address\.id\}`/);
  assert.match(workspace, /addressEditors\[address\.id\] && <form/);
  assert.match(workspace, /current\[address\.id\] \? \{\} : \{ \[address\.id\]: true \}/);
  assert.match(workspace, /requestAnimationFrame\(\(\) => document\.querySelector<HTMLInputElement>\(`/);
  assert.match(workspace, /document\.getElementById\(`address-edit-toggle-\$\{address\.id\}`\)\?\.focus\(\)/);
});

test("customer workspace fills the viewport canvas while preserving responsive gutters", () => {
  assert.match(styles, /\.shell \{ width: 100%; max-width: none; margin-inline: 0; padding-inline: clamp\(16px, 3vw, 40px\); \}/);
  assert.match(styles, /\.accountHeader \{ width: 100%; max-width: none;/);
  assert.match(styles, /@media \(max-width: 420px\) \{[\s\S]*?\.shell \{ width: 100%; padding-inline: 12px; \}/);
});
