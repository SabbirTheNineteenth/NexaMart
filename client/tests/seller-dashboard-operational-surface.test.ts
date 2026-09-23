import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller dashboard keeps the operational rail and topbar comfortably touchable", () => {
  assert.match(dashboard, /aria-label="Seller workspace command"/);
  const controls = [
    ".sellerNavigation a",
    ".topbarAction",
    ".inventoryAttentionHead a",
    ".inventoryActions :global(summary)",
    ".workspace :global(button:not(.primary-button):not(.seller-promotion-delete))",
    ".workspace :global(.seller-promotion-delete)",
  ];
  const undersized = controls.filter((selector) => {
    const rule = stylesheet.split(`${selector} {`)[1]?.split("}")[0] ?? "";
    const height = rule.match(/min-height:\s*(\d+)px\s*;/)?.[1];
    assert.ok(height, `${selector} needs an explicit minimum touch target`);
    return Number(height) < 44;
  });
  assert.deepEqual(undersized, [], `Seller touch targets below 44px: ${undersized.join(", ")}`);
});

test("seller dashboard makes action, focus, and feedback states explicit without motion for reduced-motion users", () => {
  assert.match(stylesheet, /\.workspace :global\(\.primary-button\)\s*\{[^}]*min-height:\s*44px/);
  assert.match(stylesheet, /\.workspace :global\(button:focus-visible\)[^}]*outline:\s*3px solid/);
  assert.match(stylesheet, /\.workspace :global\(\.seller-profile-success\)[\s\S]*?\.workspace :global\(\.seller-error\)/);
  assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.workspace \*[^}]*animation:\s*none;\s*transition:\s*none;\s*scroll-behavior:\s*auto;/);
});

test("seller dashboard gives loading, empty, and failed work clear bounded surfaces", () => {
  assert.match(dashboard, /className=\{styles\.workspaceState\}/);
  assert.match(dashboard, /aria-busy=\{notificationsLoading\}/);
  assert.match(dashboard, /No inventory needs attention right now\./);
  assert.match(stylesheet, /\.workspaceState\s*\{[^}]*border:\s*1px solid var\(--seller-line\)/);
});

test("seller dashboard keeps compact controls and tables usable on narrow screens", () => {
  assert.match(stylesheet, /\.sellerContent\s*\{[^}]*min-width:\s*0/);
  assert.match(stylesheet, /\.inventoryTableWrap\s*\{[^}]*overflow-x:\s*auto;[^}]*overscroll-behavior-x:\s*contain/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.topbarActions,\.topbarAction\s*\{\s*width:\s*100%/);
});

test("seller dashboard contains its compact command bar and keeps dashboard controls touchable", () => {
  assert.match(stylesheet, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.operationsHeader\s*\{[^}]*flex-direction:\s*column/);
  assert.match(stylesheet, /@media\s*\(max-width:\s*420px\)[\s\S]*?\.topbarActions,\.topbarAction\s*\{\s*width:\s*100%/);
  assert.match(stylesheet, /\.workspace :global\(input\),\.workspace :global\(textarea\),\.workspace :global\(select\)\s*\{[^}]*min-height:\s*44px/);
  assert.match(stylesheet, /\.workspace :global\(\.primary-button\)\s*\{[^}]*min-height:\s*44px/);
});

test("seller dashboard announces a failed workspace load without pretending data was available", () => {
  assert.match(dashboard, /workspaceState === "error"[\s\S]*?role="alert" aria-labelledby="seller-workspace-error-heading"/);
  assert.match(dashboard, /Your seller data was not loaded\./);
  assert.match(dashboard, /logoutState\.state === "error"[\s\S]*?role="alert"/);
});
