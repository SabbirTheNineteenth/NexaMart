import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const productForm = readFileSync(new URL("../src/features/seller/SellerProductForm.tsx", import.meta.url), "utf8");
const promotionForm = readFileSync(new URL("../src/features/seller/SellerPromotionForm.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const dashboardStyles = readFileSync(new URL("../src/features/seller/SellerDashboard.module.css", import.meta.url), "utf8");

test("seller workspaces have guarded route-specific loaders with loading ready error and retry states", () => {
  assert.match(dashboard, /type WorkspaceState = "loading" \| "ready" \| "error";/);
  assert.match(dashboard, /const \[workspaceState, setWorkspaceState\] = useState<WorkspaceState>\("loading"\);/);
  assert.match(dashboard, /const loadWorkspace = useCallback\(\(\) => \{/);
  const loader = dashboard.slice(dashboard.indexOf("const loadWorkspace"), dashboard.indexOf("const saveStock"));
  for (const endpoint of ["products", "promotions", "orders", "finance", "application"]) assert.match(loader, new RegExp(`/seller/${endpoint}`));
  assert.match(loader, /Promise\.all\(\[/);
  assert.match(loader, /setWorkspaceState\("ready"\)/);
  assert.match(loader, /if \(controller\.signal\.aborted\) return;/);
  assert.match(loader, /setWorkspaceState\("error"\)/);
  assert.match(dashboard, /workspaceState === "loading"/);
  assert.match(dashboard, /workspaceState === "error"[\s\S]*?onClick=\{loadWorkspace\}[\s\S]*?Retry workspace/);
  assert.match(dashboard, /activeSection !== "analytics" && activeSection !== "reviews" && workspaceState === "error"/);
});

test("seller creation actions preserve the dedicated product workspace and promotion disclosure", () => {
  assert.match(dashboard, /const \[createTarget, setCreateTarget\] = useState<"promotion" \| null>\(null\);/);
  assert.match(dashboard, /href="\/seller\/catalog\/add"/);
  assert.match(dashboard, /onClick=\{\(\) => setCreateTarget\("promotion"\)\}/);
  assert.match(dashboard, /<SellerPromotionForm[\s\S]*?open=\{createTarget === "promotion"\}/);
  assert.match(productForm, /useEffect/);
  assert.match(productForm, /inputRef\.current\?\.focus\(\)/);
  assert.match(productForm, /ref=\{inputRef\}/);
  assert.match(promotionForm, /inputRef\.current\?\.focus\(\)/);
  assert.match(promotionForm, /ref=\{inputRef\}/);
});

test("seller workspace offers a first focusable skip link, polite load states, and responsive panel styling", () => {
  assert.match(dashboard, /<a className="skip-link" href="#seller-workspace-content">Skip to workspace content<\/a>/);
  assert.match(dashboard, /id="seller-workspace-content" tabIndex=\{-1\}/);
  assert.match(dashboard, /<h2 id="seller-orders-heading" tabIndex=\{-1\}>Recent orders<\/h2>/);
  assert.match(dashboard, /className="seller-state" role="status" aria-live="polite"/);
  assert.match(styles, /\.skip-link\{/);
  assert.match(styles, /\.skip-link:focus\{/);
  assert.match(styles, /\.seller-workspace \.seller-profile,/);
  assert.match(styles, /\.seller-workspace \.seller-create,/);
  assert.match(styles, /\.seller-workspace \.seller-empty\{/);
  assert.match(styles, /@media\(max-width:760px\)\{[\s\S]*\.seller-workspace \.seller-profile/s);
});

test("seller workspace retains source-verifiable readable narrow rail and reduced-motion safeguards", () => {
  assert.match(dashboardStyles, /@media\(max-width:900px\)\{[\s\S]*\.sellerSidebar\{position:relative/s);
  assert.match(dashboardStyles, /@media\(max-width:900px\)\{[\s\S]*\.sellerNavigation\{display:flex;[\s\S]*overflow-x:auto[\s\S]*\.sellerNavigation a\{flex:0 0 auto/s);
  assert.match(dashboardStyles, /@media\(max-width:640px\)\{[\s\S]*\.workspaceContext>span:first-child,.sectionContext\{display:none/s);
  assert.doesNotMatch(dashboardStyles, /\.sellerNavigation a\{[^}]*font-size:0/);
  assert.match(dashboardStyles, /@media\(prefers-reduced-motion:reduce\)\{\.workspace \*\{animation:none!important;transition:none!important;scroll-behavior:auto!important\}\}/);
});
