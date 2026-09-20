import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");

test("seller workspace primary-load errors explain the unavailable section and offer a truthful retry", () => {
  assert.match(dashboard, /workspaceState === "error" \? <section className="seller-empty" role="alert" aria-labelledby="seller-workspace-error-heading">/);
  assert.match(dashboard, /<p className="eyebrow">Workspace unavailable<\/p><h2 id="seller-workspace-error-heading">Unable to load .*?<\/h2><p>Your seller data was not loaded\. Try again to request the selected workspace\.<\/p>/);
  assert.match(dashboard, /onClick=\{loadWorkspace\}>Retry workspace<\/button>/);
});
