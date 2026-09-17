# NexaMart visual parity QA

## C07 Deals live-state evidence - 2026-09-18

- The panel-01 customer header, compact responsive hero, and bounded state surface were opened from a fresh production-like localhost build at 1440, 700, 420, and 390. Real API captures are `artifacts/qa/deals-{1440,700,420,390}-localhost-c07-empty.png` and state-focused equivalents ending `-localhost-c07-empty-state.png`; the local authoritative endpoint returned `200 {"products":[]}`, so the visible empty copy is genuine.
- The existing error/retry UI was separately exercised by aborting only the browser request. `artifacts/qa/deals-{1440,700,420,390}-localhost-c07-error-retry-state.png` shows its alert and retry control; the harness recorded `RETRY_LOADING=1` then `RETRY_ERROR=1` at every width. These are controlled fault-injection checks, not evidence of a populated deal or a backend failure.
- No active deal was returned by the existing API, so no fake card or invented promotion information was rendered. C07 remains partial until an actual active-deals response can be captured at all four widths.

## S01 session-20 seller-authenticated workspace blocker - 2026-09-17

- Opened fresh real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session20-blocked.png`.
- The inspected four-width set shows the responsive seller sign-in surface rather than a seller command workspace. Capture logging contained 404/401/500 resource responses; these files are blocker evidence only and do not satisfy ready, loading, empty, error/retry, or wrong-role acceptance.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`; no credentials, cookies, registrations, seeds, or API mutations were used. Focused role-gate verification passed 3/0 and client typecheck passed. No visible control exposed a missing backend contract.

## S01 session-19 seller-authenticated workspace blocker - 2026-09-17

- Opened fresh real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session19-blocked.png`.
- The inspected 1440px and 390px captures show the responsive seller sign-in surface rather than a seller command workspace. Capture logging contained 404/401/500 resource responses; these files are blocker evidence only and do not satisfy ready, loading, empty, error/retry, or wrong-role acceptance.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`; no credentials, cookies, registrations, seeds, or API mutations were used. Focused role-gate verification passed 3/0 and client typecheck passed. No visible control exposed a missing backend contract.

## S01 session-18 blocker revalidation - 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required` without a session. No credentials, cookies, registrations, seeds, or API mutations were used.
- Opened and inspected fresh real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session18-blocked.png`. Each is the truthful responsive seller sign-in surface, not an authenticated command workspace; capture logging included 404/401/500 resource responses. These are blocker evidence only and cannot validate ready, loading, empty, error/retry, or wrong-role workspace states.
- Focused role-gate verification passed 3/0; client typecheck and `git diff --check` passed. S01 remains unresolved pending an authorized legitimate seller localhost session.

## S01 session-17 blocker revalidation - 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required` without a session. No credentials, cookies, registrations, seeds, or API mutations were used.
- Opened and inspected fresh real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session17-blocked.png`. Each is the truthful responsive seller sign-in surface, not an authenticated command workspace; capture logging included 404/401/500 resource responses. These are blocker evidence only and cannot validate ready, loading, empty, error/retry, or wrong-role workspace states.
- Focused role-gate suite passed 3/0; client typecheck and `git diff --check` passed. S01 remains blocked pending a legitimate seller-authenticated localhost session.

## S01 session-16 blocker revalidation - 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401` without a session. No credentials, cookies, registrations, seeds, or API mutations were used.
- Opened and inspected fresh real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session16-blocked.png`. Each is the truthful responsive seller sign-in surface, not an authenticated command workspace; capture logging included 404/401/500 resource responses. These are blocker evidence only and cannot validate ready, loading, empty, error/retry, or wrong-role workspace states.
- Focused role-gate suite passed 3/0; client typecheck and `git diff --check` passed. S01 remains blocked pending a legitimate seller-authenticated localhost session.

## S01 session-15 blocker revalidation — 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required` without a session. No credentials, cookies, registrations, seeds, API mutations, backend changes, migrations, deployments, commits, resets, or cleanup were used.
- Fresh `/seller` captures at 1440, 700, 420, and 390 are `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session15-blocked.png`. The inspected responsive set shows the truthful seller sign-in surface, not the seller command workspace; browser capture logged 404/401/500 resources. These are blocker evidence only.
- `auth-protected-workspace-gate.test.ts` passed 3/0; `npm.cmd run typecheck` and `git diff --check` passed. S01 remains unresolved: owner-valid acceptance requires a legitimate seller session and the real ready, loading, empty, error/retry, and wrong-role workspace states at all four viewports.

## S01 session-14 blocker revalidation — 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401` without a session. No credentials, cookies, registrations, seeds, API mutations, backend changes, migrations, deployments, commits, resets, or cleanup were used.
- Fresh `/seller` captures at 1440, 700, 420, and 390 are `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session14-blocked.png`. The opened 1440 and 390 captures show the truthful responsive seller sign-in surface, not the seller command workspace; browser capture logged 404/401/500 resources. These are blocker evidence only.
- `auth-protected-workspace-gate.test.ts` passed 3/0; `npm.cmd run typecheck` and `git diff --check` passed. S01 remains unresolved: owner-valid acceptance requires a legitimate seller session and the real ready, loading, empty, error/retry, and wrong-role workspace states at all four viewports.

## S01 session-13 blocker revalidation — 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401` without a session. No credentials, cookies, registrations, seeds, API mutations, backend changes, migrations, deployments, commits, resets, or cleanup were used.
- Opened fresh `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session13-blocked.png`. The inspected 1440 and 390 images, and the captured responsive set, show the truthful seller sign-in UI rather than the command workspace. Capture logging included 404/401/500 resources; these are blocker evidence only.
- `auth-protected-workspace-gate.test.ts` passed 3/0; `npm.cmd run typecheck` and `git diff --check` passed. S01 remains unresolved: owner-valid acceptance needs a legitimate seller session and the real ready, loading, empty, error/retry, and wrong-role workspace states at all four viewports.

## S01 session-10 blocker revalidation — 2026-09-17

- A fresh unauthenticated localhost probe returned `401 Authentication required` from `GET /api/auth/me`. The API-authoritative `/seller` route therefore rendered the genuine seller sign-in UI rather than an invented workspace.
- Opened captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session10-blocked.png`. All four are sign-in cards; they do not validate the seller command workspace's ready, loading, empty, error/retry, or wrong-role states. Browser capture recorded 404/401/500 resource errors, so these files are blocker evidence only.
- `auth-protected-workspace-gate.test.ts` passed 3/0 and `npm.cmd run typecheck` passed. No visual code changed, and no missing visible-control contract was found.

## S01 session-9 blocker revalidation — 2026-09-17

- A fresh unauthenticated localhost probe returned `401 Authentication required` from `GET /api/auth/me`. The API-authoritative `/seller` route therefore rendered the genuine seller sign-in UI rather than an invented workspace.
- Opened captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session9-blocked.png`. All four are sign-in cards; they do not validate the seller command workspace's ready, loading, empty, error/retry, or wrong-role states. Browser capture recorded 404/401/500 resource errors, so these files are blocker evidence only.
- `auth-protected-workspace-gate.test.ts` passed 3/0; `npm.cmd run typecheck` and `git diff --check` passed. No visual code changed, and no missing visible-control contract was found.

## S01 session-8 blocker revalidation — 2026-09-17

- `GET http://localhost:3003/api/auth/me` returned `401` without a session. The API-authoritative seller route consequently rendered its genuine sign-in surface at 1440, 700, 420, and 390; opened captures: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session8-blocked.png`.
- These captures do not satisfy S01 because they are not seller command-workspace renders. No seller credential, cookie, account registration, seed, or mutation was used to simulate one. The capture runner additionally logged 404/401/500 browser resource responses; they are not used as ready-state evidence.
- Focused `auth-protected-workspace-gate.test.ts` passed 3/0; client typecheck and `git diff --check` passed. A legitimate seller session is still required to inspect ready, loading, empty, error/retry, and wrong-role states at all four viewports.

## S01 authenticated-workspace evidence blocker — 2026-09-17

- The live local API returned `401` for an unauthenticated `GET /api/auth/me`; no credentials or session material were accessed. The shared `RoleProtectedWorkspace` therefore correctly sent `/seller` to its real seller sign-in route.
- Fresh production-like localhost captures from the existing port-3003 client listener were opened at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session7-blocked.png`. Every image is the truthful seller sign-in UI, not a command-workspace substitute.
- Focused API-authoritative role-gate test passed (3/0); `client: npm.cmd run typecheck` and `git diff --check` passed. The broad client suite was not used as acceptance evidence and currently has unrelated existing failures. S01 remains blocked pending a legitimate seller-authenticated localhost session, which is necessary to inspect real loading, empty, error, and wrong-role workspace states. No visible control exposed a missing backend contract.

## C04 session-6 loading-count verification â€” 2026-09-17

- Production-like Explore captures from `next start` at `http://localhost:3006` were opened at 1440, 700, 420, and 390: `artifacts/qa/explore-{1440,700,420,390}-localhost-c04-session6-final.png` and `artifacts/qa/explore-{1440,700,420,390}-localhost-c04-session6-grid.png`.
- The desktop grid remains four dense cards with top-right saved-piece hearts, API-derived availability, and compact sort/grid controls. At 700px, 420px, and 390px the grid remains readable in two columns. The toolbar now says `Loading products` before catalog resolution rather than announcing a zero count; standard products retain the truthful standard marker.
- Each capture logged only an expected signed-out normalized `401` browser response from existing session/cart probing. No frontend control revealed a missing backend contract.

## Comparison target and method

- User-owned reference: `C:/Users/HP!/Pictures/Screenshots/nexamart.jpg`.
- Browser: Playwright Chromium headless shell, production `next start` at `http://localhost:3003`; local catalog API returned `200` during capture.
- Viewports: 1440×1050, 700×1000, 420×900, and 390×844. Production output has no Next development indicator.

## Route evidence

All files below were opened and inspected after the final recapture.

| Surface | 1440 | 700 | 420 | 390 |
| --- | --- | --- | --- | --- |
| Explore | `artifacts/qa/explore-1440-production.png` | `artifacts/qa/explore-700-production.png` | `artifacts/qa/explore-420-production.png` | `artifacts/qa/explore-390-production.png` |
| Product detail | `artifacts/qa/product-1440-production.png` | `artifacts/qa/product-700-production.png` | `artifacts/qa/product-420-production.png` | `artifacts/qa/product-390-production.png` |
| Deals | `artifacts/qa/deals-1440-production.png` | `artifacts/qa/deals-700-production.png` | `artifacts/qa/deals-420-production.png` | `artifacts/qa/deals-390-production.png` |
| Store directory | `artifacts/qa/stores-1440-production.png` | `artifacts/qa/stores-700-production.png` | `artifacts/qa/stores-420-production.png` | `artifacts/qa/stores-390-production.png` |
| Public store | `artifacts/qa/public-store-1440-production.png` | `artifacts/qa/public-store-700-production.png` | `artifacts/qa/public-store-420-production.png` | `artifacts/qa/public-store-390-production.png` |
| Account | `artifacts/qa/account-1440-production.png` | `artifacts/qa/account-700-production.png` | `artifacts/qa/account-420-production.png` | `artifacts/qa/account-390-production.png` |
| Seller | `artifacts/qa/seller-1440-production.png` | `artifacts/qa/seller-700-production.png` | `artifacts/qa/seller-420-production.png` | `artifacts/qa/seller-390-production.png` |
| Admin | `artifacts/qa/admin-1440-production.png` | `artifacts/qa/admin-700-production.png` | `artifacts/qa/admin-420-production.png` | `artifacts/qa/admin-390-production.png` |
| Login | `artifacts/qa/login-1440-production.png` | `artifacts/qa/login-700-production.png` | `artifacts/qa/login-420-production.png` | `artifacts/qa/login-390-production.png` |
| Register | `artifacts/qa/register-1440-production.png` | `artifacts/qa/register-700-production.png` | `artifacts/qa/register-420-production.png` | `artifacts/qa/register-390-production.png` |

## Interaction and state evidence

- Menu open: `artifacts/qa/explore-390-menu-open-production.png`; Escape closes it and returns focus to `Toggle marketplace categories`: `artifacts/qa/explore-390-menu-escape-production.png`.
- Bag drawer: `artifacts/qa/explore-390-bag-open-production.png`; Escape closes it (`DRAWER_PRESENT_AFTER_ESCAPE=0`): `artifacts/qa/explore-390-bag-escape-production.png`.
- Normalized unauthenticated wishlist feedback: `artifacts/qa/product-390-wishlist-unauthenticated-production.png` (`Sign in from Account to save pieces.`). The focused wishlist regression verifies the intervening truthful `Saving…` pending label and post-response success/error behavior.

## Reference comparison and repair

The final captures preserve the reference's obsidian/plum hierarchy, orchid/violet action contrast, compact control density, image-led customer composition, and role-aware authentication panels. The approved existing NexaMart asset renders as a cropped 30px desktop / 27px mobile monogram in shared headers; real catalog media remains object-cropped.

One mismatch was found: the administrator auth heading had a legacy narrow-width constraint. RED coverage was added in `client/tests/canonical-theme-system.test.ts`; the canonical mobile rule now supplies `max-width:none`, `min-width:0`, and normal wrapping for `.role-auth-panel h1`. Final Admin captures at 700px, 420px, and 390px show the complete heading. The admin logo expectation now asserts the actual approved monogram behavior.

No remaining P0/P1/P2 mismatch was found. Signed-out protected/account probes return expected normalized `401` responses and render their intended entry states.

## Final result

blocked — 2026-09-17 (acceptance invalidated by owner)

### S01 session-12 authenticated-workspace blocker revalidation — 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`; no session, credentials, cookies, registrations, seeds, or mutations were available or used.
- Opened and inspected the real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session12-blocked.png`. They render the responsive seller sign-in UI, not an authenticated seller workspace, and are blocker evidence only. The capture runner logged 404/401/500 resources.
- `auth-protected-workspace-gate.test.ts` passed 3/0 and `npm.cmd run typecheck` passed. The required authenticated ready, loading, empty, error/retry, and wrong-role workspace states remain unverified pending a legitimate seller localhost session.

### S01 session-11 authenticated-workspace blocker revalidation — 2026-09-17

- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`; no session, credentials, cookies, registrations, seeds, or mutations were available or used.
- Opened the real `/seller` captures at 1440, 700, 420, and 390: `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session11-blocked.png`. They render the responsive seller sign-in UI, not an authenticated seller workspace, and are blocker evidence only. The capture runner logged 404/401/500 resources.
- Focused `client: node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test tests/auth-protected-workspace-gate.test.ts` passed 3/0; `client: npm.cmd run typecheck` and `git diff --check` passed. No visual code changed, so no RED-to-GREEN test applies. Required S01 acceptance evidence remains an owner-valid legitimate seller session with ready, loading, empty, error/retry, and wrong-role workspace captures at all four viewports.

The owner directly inspected localhost and determined that the accepted captures do not structurally match the binding reference. All earlier acceptance statements, including the 40-image capture review, are invalid and must not be used to claim parity. Frontend work has reopened under `REFERENCE_TO_LOCALHOST_PARITY_MATRIX.md`; no backend expansion may begin until that matrix is evidence-complete and owner-required structure is reproduced.

The reference has been reclassified as a visual direction board, not a combined production homepage: Customer Explore maps to `/` and public customer routes; Seller Command to `/seller/*`; Admin Operations to `/admin/*`; and Role-Aware Authentication to `/login*` and `/register*`. The accidental composite-root experiment was removed under a focused RED→GREEN regression; parity remains blocked.

Customer C01 remains blocked. A first live, API-preserving desktop facet/grid CSS pass was captured at `artifacts/qa/explore-{1440,700,420,390}-customer-c01.png`; the 1440 capture still puts the non-reference department section ahead of the compact facet/product workspace. This is evidence of an incomplete structural repair, not acceptance.

### C01 hierarchy repair — 2026-09-17

- RED: `client: node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test tests/reference-parity-shell.test.ts` — 3 passed / 1 failed. The desktop rule hid `.marketplace-hero-copy`, contradicting the reference editorial left column.
- GREEN: the same focused test — 4 passed / 0 failed after the live collection was ordered before discovery showcases and the desktop hero restored as editorial text plus product art.
- Fresh local evidence: `artifacts/qa/explore-1440-customer-c01-hero.png`, `artifacts/qa/explore-700-customer-c01-hero.png`, `artifacts/qa/explore-420-customer-c01-hero.png`, and `artifacts/qa/explore-390-customer-c01-hero.png`.
- Finding: the corrected 1440 capture places the compact hero and live facet-led collection in the required sequence. It is still **not accepted**: app-bar density, availability/type facets, populated dense four-card grid, and recently-viewed composition remain unmatched. The capture browser logged unauthenticated `401` responses, so it did not provide populated product-grid evidence. Backend remains paused.

### Customer extension-route baseline evidence — 2026-09-17

- Product Detail: `artifacts/qa/product-{1440,700,420,390}-product-c02-baseline.png`. The active product route keeps real image, price, bag, and wishlist controls. At 390px the media and information stack without horizontal overflow. It remains unaccepted because panel 01 has no standalone detail specification and the shared compact header mismatch continues.
- Deals: `artifacts/qa/deals-{1440,700,420,390}-deals-c03-baseline.png`. The live empty state is truthful (`No active deals are available right now.`); no fake offer cards were introduced. This is evidence only, not acceptance.
- Store Directory: `artifacts/qa/stores-{1440,700,420,390}-stores-c04-baseline.png`. The current shared-header/system baseline was captured; populated/empty/error state evidence remains required.

### Clean production-like reopened baseline — 2026-09-17

- Rebuilt using the local QA API target and captured from `next start` at `http://localhost:3003`, not the development server. The 40 files are `artifacts/qa/{explore,product,deals,stores,public-store,account,seller,admin,login,register}-{1440,700,420,390}-production-reopened-baseline.png`. No Next development indicator is visible in the opened Explore capture.
- Customer routes have real catalog/store content where the existing API exposes it; signed-out account, seller, and admin surfaces correctly show their real entry gates. The seller 1440 capture is an actual seller sign-in surface, not an invented dashboard, so it cannot validate S02–S05 until a legitimate seller session is available.
- This clean capture set invalidates none of the owner’s structural findings. C01–C05, S01–S05, A01–A04, and H01–H03 remain open in `REFERENCE_TO_LOCALHOST_PARITY_MATRIX.md`; no route-family acceptance is claimed.

### C01 compact app-bar and grid repair — 2026-09-17

- RED: the focused parity test first failed for the missing reference-style app-bar and then for the grid row that placed cards below the full-height facet rail.
- GREEN: `client: node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test tests/reference-parity-shell.test.ts` — 6 passed / 0 failed; `client: npm.cmd run typecheck` and `git diff --check` passed.
- Evidence before the final grid-row repair: `artifacts/qa/explore-{1440,700,420,390}-production-c01-compact.png`. The production app bar now has the approved monogram, Shop/Categories/New Arrivals/For You tabs, search, saved-pieces/account/bag controls, and no development indicator. Final same-state recapture: `artifacts/qa/explore-{1440,700,420,390}-production-c01-grid.png`; opened 1440 confirms all four populated product cards align directly beside the facet rail. C01 remains blocked for its remaining availability/type-facet and compact recently-viewed requirements.

### C01 facets and local-history evidence — 2026-09-17

- Production capture: `artifacts/qa/explore-{1440,700,420,390}-production-c01-complete.png`; it renders populated catalog cards with category, availability, and type facets.
- Browser-local history capture: `artifacts/qa/explore-{1440,700,420,390}-production-c01-history.png`. The fixture was Playwright local storage only; no server data changed.
- A capture-only legacy payload error (`variants` absent) received a focused RED regression and null-safe GREEN repair. C01/C02 remain partial, not accepted; C04 is next after the completed C03 hero-placement slice.

### C03 hero/workspace placement — 2026-09-17

- Production-like localhost evidence: `artifacts/qa/explore-1440-production-c03-final.png`, `explore-700-production-c03-final.png`, `explore-420-production-c03-final.png`, and `explore-390-production-c03-final.png`, captured from a fresh local-QA-target build served by `next start` on port 3004. All four were opened and inspected; no development indicator was present.
- At 1440px, the real taxonomy facet rail starts alongside the hero and the hero retains separate editorial, product-art, and catalog-context columns. At 700px, 420px, and 390px the hero becomes the first collection element and stacks before truthful live filters. The existing collection CTA and department link remain keyboard-focusable anchors.
- The capture logged one expected signed-out `401` browser console error from an existing protected cart/session probe. It did not alter catalog rendering or introduce a new visible-control contract. The hero uses returned product media; the unresolved floral-art difference is recorded as R06, not accepted as a copied reference asset.

### C04 dense catalog-card composition — 2026-09-17

- Opened production-like localhost route-top and scrolled-grid captures at 1440, 700, 420, and 390: `artifacts/qa/explore-{1440,700,420,390}-production-c04-final.png` and `artifacts/qa/explore-{1440,700,420,390}-production-c04-grid.png`.
- The live grid has four equal desktop cards beside facets and responsive two-card narrow layouts, top-right saved-piece hearts, real sort, explicit grid state, and truthful stock/variant summaries. Fixture products are standard products, so no variant dots were invented. Existing signed-out probes logged expected normalized `401` responses only.

### C05 compact browser-local history rail — 2026-09-17

- Opened production-like localhost captures from the fresh local-QA build at `artifacts/qa/explore-{1440,700,420,390}-production-c05-history.png`.
- With a Playwright browser-local fixture only, the rail follows the live product grid within the collection workspace at 1440px. At 700px, 420px, and 390px it remains a compact horizontal rail with its truthful browser-local note, per-item removal, and clear-history control.
- The capture fixture did not call an API or alter server data. No visible C05 control requires a backend contract; history remains deliberately browser-local.

### C04 session-4 re-verification — 2026-09-17

- Focused RED→GREEN regression changes the compact toolbar’s live count from generic objects to singular/plural products. This remains derived only from the visible catalog result length; the existing sort URL behavior, saved-piece heart, variant summary, availability state, and bag behavior are unchanged.
- Inspected localhost captures at 1440, 700, 420, and 390: `artifacts/qa/explore-{1440,700,420,390}-localhost-c04-session4-final.png` and `artifacts/qa/explore-{1440,700,420,390}-localhost-c04-session4-grid.png`. Desktop renders four cards with image-top-right hearts and the compact sort/grid toolbar; narrow views retain two readable cards and the same controls. Returned fixture variants are rendered truthfully (standard items use the standard marker rather than invented dots); availability is API-derived.
- A fresh local-QA production build passed, but the pre-existing port-3003 `next start` process served stale build assets after that rebuild and returned 500s, so its loading-shell captures are invalid and not acceptance evidence. The live port-3002 localhost capture set above is the owner-valid visual evidence. Existing signed-out cart/session probes produced normalized 401 browser responses only. No visible control exposed a missing backend contract.

### C04 session-5 semantic grid-control verification — 2026-09-17

- Opened current production-like localhost captures at 1440, 700, 420, and 390 from a fresh `next start` on port 3005: `artifacts/qa/explore-{1440,700,420,390}-localhost-c04-session5-final.png` and `artifacts/qa/explore-{1440,700,420,390}-localhost-c04-session5-grid.png`.
- The desktop capture shows the required live dense four-card composition, hearts in the image-top-right action area, compact sort/grid display controls, and returned availability rows. The 700px, 420px, and 390px captures retain a readable sort/grid row and two-card product layout. Fixture products are standard, so their rendered em dash is truthful; no visual variant dots were invented.
- The compact toolbar now has a named control group associated with `#catalog-product-grid`, and the non-interactive grid glyph is exposed to assistive technology. The existing sort is still URL-backed; no new view mode, API, or backend contract was inferred. Signed-out session/cart probes produced expected normalized `401` console responses only.

### S01 session-21 seller-workspace blocker revalidation - 2026-09-17

- Opened `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session21-blocked.png`. All four viewport captures render the responsive seller sign-in surface; none is accepted as seller-command evidence.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`. The browser logged 404/401/500 resource responses during capture. No legitimate seller session was available, and no credentials, cookies, registrations, seeds, or API mutations were used.
- The real seller command workspace's ready, loading, empty, error/retry, and wrong-role states remain unverified at every required viewport. No visible-control backend contract was exposed; backend work remains paused.

### S01 session-22 seller-workspace blocker revalidation - 2026-09-17

- Opened `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session22-blocked.png`. All four viewport captures render the responsive seller sign-in surface; none is accepted as seller-command evidence.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`. The browser logged 404/401/500 resource responses during capture. No legitimate seller session was available, and no credentials, cookies, registrations, seeds, or API mutations were used.
- The real seller command workspace's ready, loading, empty, error/retry, and wrong-role states remain unverified at every required viewport. No visible-control backend contract was exposed; backend work remains paused.

### S01 session-23 seller-workspace blocker revalidation - 2026-09-17

- Opened `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session23-blocked.png`. The inspected 1440, 700, 420, and 390 captures all show the responsive seller sign-in surface, not the seller command workspace.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Authentication required`. Capture logging recorded 404/401/500 resource responses. No credentials, cookies, registrations, seeds, API mutations, migrations, deployment, commit, reset, or cleanup were used.
- The required seller-authenticated ready, loading, empty, error/retry, and wrong-role workspace evidence remains unavailable. Focused role-gate verification passed 3/0 and typecheck passed; no production change or backend contract was exposed.

### S01 session-24 seller-workspace blocker revalidation - 2026-09-17

- Opened `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session24-blocked.png`. The inspected 1440, 700, 420, and 390 captures all show the responsive seller sign-in surface, not the seller command workspace.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Unauthorized`. Capture logging recorded 404/401/500 resource responses. No credentials, cookies, registrations, seeds, API mutations, migrations, deployment, commit, reset, or cleanup were used.
- The required seller-authenticated ready, loading, empty, error/retry, and wrong-role workspace evidence remains unavailable. Focused role-gate verification passed 3/0, typecheck and `git diff --check` passed; no production change or backend contract was exposed.

### S01 session-25 seller-workspace blocker revalidation - 2026-09-17

- Opened `artifacts/qa/seller-{1440,700,420,390}-localhost-s01-session25-blocked.png`. Every inspected viewport renders the responsive seller sign-in surface, rather than the seller command workspace.
- Read-only `GET http://localhost:3003/api/auth/me` returned `401 Unauthorized`. Capture logging recorded 404/401/500 resource responses. No credentials, cookies, registrations, seeds, API mutations, migrations, deployment, commit, reset, or cleanup were used.
- The required seller-authenticated ready, loading, empty, error/retry, and wrong-role workspace evidence remains unavailable. Focused role-gate verification passed 3/0, typecheck and `git diff --check` passed; no production change or backend contract was exposed.
## C06 product-detail Explore-header slice - 2026-09-18

- Inspected real localhost `/products/demo-store-auralis-orbit-headphones` at 1440, 700, 420, and 390: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session1-final.png`.
- Desktop uses compact live Explore navigation alongside search and the existing Stores, Wishlist, Account, and Bag controls. Narrow widths hide only the desktop tabs and retain the searchable, purchasable product hierarchy.
- Expected signed-out session/cart probes returned 401 while the public catalog product loaded normally. No missing backend control contract was exposed.

## C06 compact customer controls - 2026-09-18

- Opened production-like localhost product-detail captures at 1440, 700, 420, and 390 from the fresh port-3010 `next start`: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session2-final.png`.
- The desktop capture keeps the compact Explore tabs, search, and icon-form Stores, saved-pieces, Account, and Bag destinations in the panel-01 hierarchy. At 700, 420, and 390, the tabs hide but all existing customer destinations remain compact, labeled icon links alongside the responsive search. Product media, truthful price/availability, bag control, and save control remain readable.
- Signed-out session/cart probes logged normalized 401 responses; public product data loaded normally. The authenticated wishlist saving/success state still requires a legitimate customer session, and R06 remains the separate artwork gap. No backend contract is inferred.

## C06 wishlist pending affordance - 2026-09-18

- Opened fresh production-like localhost product-detail captures at 1440, 700, 420, and 390 from the current `next start` on port 3011: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session3-final.png`. The compact Explore header, responsive media/detail order, price, add-to-bag, and save actions remain readable at every width.
- Opened supporting purchase-panel captures at the same four widths: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session3-purchase.png`. The compact heart action remains aligned with Add to bag; its new pending spinner is only reachable through the real authenticated POST and was not fabricated without a customer session. The new spinner has an explicit reduced-motion stop rule.
- Expected signed-out session/cart requests produced normalized 401 responses only. Public catalog rendering and the existing wishlist error route remain truthful; no backend contract is inferred.

## C06 product-detail panel context strip - 2026-09-18

- Opened production-like localhost route-top and purchase-panel captures from `next start` on port 3012 at 1440, 700, 420, and 390: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session4-{final,purchase}.png`.
- The real product route now identifies its customer-system position with a compact `01 / Product detail` strip paired with the existing Back to catalog link. Desktop retains live Explore tabs, search, Stores, saved pieces, Account, and Bag; 700, 420, and 390 retain the compact search, controls, strip, image/detail sequence, availability, price, Add to bag, and save action without clipping.
- The public product loaded at every viewport. Expected signed-out session/cart probes returned normalized 401 responses only. The authenticated wishlist saving/success screenshots are still unavailable without a legitimate customer session; no backend contract is inferred.

## C06 purchase-panel hierarchy — 2026-09-18

- Opened production-like localhost captures at 1440, 700, 420, and 390 from `next start` on port 3013: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session5-final.png`.
- The live public product retains returned image, brand/category/availability, price, full-width primary Add to bag control, and compact save action inside a bordered summary panel. Expected unsigned cart/session probes returned normalized 401 responses only. Authenticated wishlist saving/success remains unaccepted pending a legitimate session.
## C06 narrow summary containment — 2026-09-18

- Opened production-like localhost product-detail captures at 1440, 700, 420, and 390 from a fresh `next start` on port 3014: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session6-containment.png`.
- The panel-01 header, image, bordered returned-product summary, availability/category values, price, Add to bag, and saved-pieces action remain inside the viewport at every required width. Browser geometry confirms no horizontal document overflow: 1440/1440, 700/700, 420/420, and 390/390 scroll/client widths. Expected signed-out session/cart probes returned normalized 401 responses only; no authenticated wishlist state is claimed.

## C06 loading and retry state frame — 2026-09-18

- Opened production-like localhost public-ready captures at 1440, 700, 420, and 390 from `next start` on port 3015: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session7-state-frame.png`.
- The ready route retains the compact Explore header, product media, bordered summary, price, Add to bag, and save action at every viewport. The corresponding real loading and retry-error markup now occupies a bounded dark customer frame with preserved `status`, `alert`, disabled retry, and `aria-busy` semantics; no state was fabricated for capture.
- Public product data rendered at every capture size. Expected signed-out session/cart requests returned normalized 401 responses only. Authenticated wishlist saving/success remains unavailable without a legitimate customer session; no backend contract is inferred.

## C06 purchase feedback hierarchy — 2026-09-18

- Opened fresh production-like localhost captures at 1440, 700, 420, and 390 from `next start` on port 3016: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session8-feedback.png`.
- The public ready route retains the compact Explore header, product media, bordered summary, price, primary Add to bag control, and saved-pieces control at all four widths. Existing cart and wishlist status/alert feedback now has a compact bounded orchid surface directly beneath those controls; the capture does not fabricate an authenticated result state.
- Browser measurements were 1440/1440, 700/700, 420/420, and 390/390 scroll/client widths. The only console response was the expected signed-out `401` session probe; authenticated wishlist saving/success remains blocked by the absence of a legitimate customer session.

## C06 product media-frame hierarchy — 2026-09-18

- Opened fresh production-like public `/products/demo-store-auralis-orbit-headphones` captures at 1440, 700, 420, and 390 from `next start` on port 3017: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session9-media-frame.png`.

## C06 product-facts ledger hierarchy — 2026-09-18

- Opened fresh production-like public `/products/demo-store-auralis-orbit-headphones` captures at 1440, 700, 420, and 390 from port 3018: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session10-facts.png`.
- Returned Availability and Category facts render as a compact bordered two-column ledger on desktop and contained stacked rows at 700, 420, and 390. The verified public route retains the compact Explore header, real media, product description, price, bag action, and saved-pieces action.
- Only expected signed-out `401` probes appeared in the browser console. This is public-ready evidence only; real authenticated wishlist saving/success remains unverified without a legitimate customer session.

## C06 variant panel hierarchy — 2026-09-18

- Opened production-like public product captures at 1440, 700, 420, and 390 from `next start` on port 3019: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session11-variants.png`.
- The customer header, context strip, media, fact ledger, price, bag action, and saved-pieces control remain contained at every width (1440/1440, 700/700, 420/420, 390/390 scroll/client widths). The API's public fixture currently returns no variants, so no invented variant data or interaction state was used for the capture. The existing real variant controls are structurally covered by focused RED→GREEN tests.
## C06 context-strip return containment — 2026-09-18

- Opened and inspected production-like public product-detail captures from `next start` on port 3021 at 1440, 700, 420, and 390: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session12-context-final.png`.
- The real `01 / Product detail` strip keeps its existing Back to catalog link non-shrinking, no-wrap, and inset from the viewport edge. The live image/detail, availability, price, bag, and saved-pieces actions remain readable at each width. The only browser console responses were expected signed-out `401` session probes.
- This accepts public-ready hierarchy only. Authenticated wishlist saving/success remains unverified without a legitimate customer session; no backend contract is inferred.

## C06 authenticated wishlist blocker revalidation — 2026-09-18

- The read-only session check at `127.0.0.1:3003` returned `401 Unauthorized`. Captures at 1440, 700, 420, and 390 are `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session13-blocked-ready.png`.
- Inspection found unstyled loading markup and 404/500 resource responses at every width. These images are infrastructure-blocker evidence, not accepted parity screenshots. A legitimate customer session and healthy current-build listener are required before verifying true wishlist saving and Saved states.

## C06 session-14 healthy-listener authenticated wishlist blocker revalidation - 2026-09-18

- A fresh `next start` listener on port 3022 rendered the current optimized public product route at 1440, 700, 420, and 390. The opened evidence is `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session14-healthy-public.png`; all four show the responsive header/context, product media, summary, facts, and purchase controls without the stale-listener resource failures.
- This is public-ready evidence only. `GET http://127.0.0.1:3022/api/auth/me` returned `401 Unauthorized`, so a real customer-owned session was unavailable and no saving/Saved screenshot is claimed. No backend-control gap is inferred.

### Prior C06 media-frame evidence

- The returned product image now sits in a compact bordered Obsidian Orchid media frame aligned with the existing bounded summary; narrow views preserve the image-first stack, panel gutters, real availability/category facts, price, Add to bag, and save control without horizontal overflow.
- The capture’s only browser console messages were expected signed-out `401` session probes. This accepts the public ready media hierarchy only; authenticated wishlist saving and success still require a legitimate customer session and are not claimed here.

## C06 session-15 authenticated wishlist blocker confirmation - 2026-09-18

- The current listener returns `200` for the real public product route and `401` for read-only `/api/auth/me`: healthy public rendering, but no legitimate customer session.
- No visual implementation changed. Existing public-ready 1440/700/420/390 captures do not establish authenticated saving or Saved feedback; C06 is not accepted and no backend gap is inferred.

## C06 session-16 authenticated wishlist infrastructure blocker - 2026-09-18

- The previous current-build listener on port 3022 is no longer reachable: read-only probes of both the public product route and `/api/auth/me` returned curl status `000`. No credentials, cookies, registrations, seeds, API mutations, or application changes were used.
- Focused C06/wishlist tests passed 18/0, typecheck passed, and `git diff --check` passed. There is no new screenshot evidence because no visual code changed and the required healthy authenticated listener was unavailable.
- C06 is still unaccepted. A legitimate customer session on a healthy current-build listener is required to inspect the real saving spinner and Saved feedback at 1440, 700, 420, and 390.
## C06 session-17 authenticated wishlist blocker revalidation — 2026-09-18

- Focused C06/product-detail/wishlist tests passed 18/0; `npm.cmd run typecheck` and `git diff --check` passed.
- Read-only `GET http://127.0.0.1:3000/api/auth/me` returned `401 Unauthorized`; the local API product fixture probe returned `404`. No credentials, cookies, registrations, seeds, API mutations, or visual/test code changes were used.
- No screenshots are acceptance evidence: without a legitimate customer session and a current product fixture, the real saving spinner and Saved feedback cannot be reached truthfully at 1440, 700, 420, and 390.

## C06 session-18 healthy-listener authenticated wishlist blocker revalidation — 2026-09-18

- Fresh production-like captures from `next start` on port 3023 were opened at 1440, 700, 420, and 390: `artifacts/qa/product-{1440,700,420,390}-localhost-c06-session18-healthy-public.png`. They show the compact header/context strip, media frame, summary/facts, and purchase controls contained on the real public product route.
- The listener’s read-only `/api/auth/me` response was `401 Unauthorized`. The four captures are public-ready blocker evidence only; they cannot establish the authenticated saving spinner or Saved feedback. No visual change or backend-control gap was identified.
