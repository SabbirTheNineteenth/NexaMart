# VISUAL-7/07 — Read-only visual parity audit

**Date:** 2026-09-17 (Asia/Dhaka)  
**Result:** **NOT READY to claim rendered visual parity.** The client has a substantial Obsidian Orchid source implementation and API-bound workflows, but no browser/capture surface was available in this audit. Desktop and narrow-mobile results below are therefore source-inspection checklists, not screenshot acceptance. The current client test gate is also red (319/326 passing).

## Scope and evidence

- Read: `VISUAL_PARITY_MANDATE.md`, `DESIGN_CONTRACT.md`, `PRODUCT_CONTEXT.md`, the direction board, all route modules, client features/components/hooks/types, styling, and client test inventory.
- Reference target: Crown Commerce for public Explore (editorial, catalog-led); Command Violet for Seller/Admin (compact permanent rail, command/context bar, dense real queues); focused role-auth split surface.
- API confirmation is static but direct: visible mutations use `postJSON`, `patchJSON`, or `deleteJSON` against existing `/api` proxy contracts. Navigation, local filtering, and browser-local recently viewed are called out separately; none are presented as remote mutations.
- No screenshots, keyboard traversal, network session, authenticated state, actual 320–420px reflow, contrast measurement, or assistive-tech pass was possible. Those remain required acceptance checks.

## Shared-system checklist

| Requirement | Source finding | Status |
| --- | --- | --- |
| Obsidian/plum/violet surface, thin borders, restrained radii | Tokenized `orchid-*`, Seller, and Admin surface systems exist; route-scoped Explore/Operate styling follows the selected direction. | Source provisioned; render unverified |
| Focus and reduced motion | Global and route-scoped `:focus-visible` and `prefers-reduced-motion` rules exist. Dialog/drawer focus restoration/trapping is implemented. | Source provisioned; behavior unverified |
| Truthful controls | No payment, carrier, delivery-time, recommendation, countdown, or fabricated catalog metrics were found in the audited public surfaces. Finance uses review/request language. | Pass, static |
| State design | Loading, empty, retry/error, success, disabled/pending states exist across data feeds and mutations. | Source provisioned; visual hierarchy unverified |
| Asset fidelity | Catalog uses server product images with fallback; the main brand mark is NexaMart’s supplied monogram. | Partial — see account wishlist gap |

## Route-level desktop/mobile checklist

`D` = desktop composition expected from source; `M` = narrow-mobile provision expected from source. A check remains open until a rendered capture confirms it.

| Route(s) | D checklist | M checklist | Verified controls / interaction | Strict parity result and gaps |
| --- | --- | --- | --- | --- |
| `/` Explore storefront | [ ] sticky branded header, search, account/wishlist/bag; [ ] editorial hero; [ ] category-led departments; [ ] product rails/grid; [ ] filters and applied facets | [ ] menu replaces dense header controls; [ ] category/menu and product rails remain operable; [ ] hero becomes one column | Catalog/taxonomy/newest feeds; URL-backed search/filter/sort; cart, quantity, removal, checkout, wishlist; recently viewed is explicitly browser-local | **Partial.** Composition is much richer/longer than the concise reference Explore screen; capture must check scroll density and hierarchy. Cart drawer has focus/Escape handling, but no rendered confirmation. |
| `/products/[slug]` | [ ] focused two-column gallery/detail; [ ] image thumbnails; [ ] variant/stock and purchase actions | [ ] media/detail stack; [ ] thumbnail and variant controls remain reachable | Product feed; variant selection; API/local cart; API wishlist | **Partial.** It lacks the reference customer header’s search, wishlist destination, and bag access; only home/account are in the header. This weakens cross-route Explore continuity. |
| `/deals` | [ ] Explore surface, clear active-deal grid, truthful server price | [ ] one-column cards and usable navigation | `/catalog/products?deals=active`; retry only | **Partial.** Its reduced header omits search, wishlist, and bag. It is a valid feed route, but not full reference header parity. |
| `/stores` and `/stores/[slug]` | [ ] editorial directory/store hero; [ ] returned store/product cards | [ ] directory one column; product grid two columns | `/catalog/stores`, `/catalog/stores/[slug]`; retry; product links | **Partial.** Same reduced-header gap; no store-level filter or bag continuity. Product imagery needs rendered crop/fallback review. |
| `/account` | [ ] account/order/address/wishlist sections use clear grouped records | [ ] address forms, statuses, and action targets avoid collision/overflow | Session/logout; orders/tracking; address CRUD/default; eligible review submit; wishlist removal | **Partial.** Functionally substantial but visually inherits older account/seller naming/classes rather than a dedicated Explore account composition. Wishlist renders `item.image` in a text span rather than a verified image asset, so visual asset parity is incomplete. Address deletion is inline confirmation, not the reusable focus-managed modal. |
| `/login`, `/login/seller`, `/login/admin` | [ ] split, role-specific auth context + focused form panel; [ ] role tabs and truthful copy | [ ] split surface falls back to a single clear panel | `/auth/login`; role-derived redirect; validation/pending/error | **Source-complete, render unverified.** Confirm photo crop, reading order, contrast, and panel stacking. |
| `/register`, `/register/seller`, `/register/admin` | [ ] same role-auth composition; [ ] seller application fields; [ ] admin provisioning-only explanation | [ ] inputs retain labels and no horizontal clipping | `/auth/register`; seller application post after registration; no admin self-registration control | **Source-complete, render unverified.** Confirm the provisioning page’s mobile balance and error state. |
| `/seller`, `/seller/{overview,analytics,profile,catalog,inventory,taxonomy,promotions,fulfillment,finance,reviews,notifications}` | [ ] persistent compact left rail; [ ] command/context bar; [ ] focused section workspace; [ ] dense genuine records | [ ] rail becomes horizontally scrollable nav; [ ] command text/action is reduced without hiding route access; [ ] metrics reflow | Seller loads/mutations: profile, catalog/product/variant/gallery, stock, taxonomy proposals, promotion CRUD, fulfillment transitions, finance review request, notifications/read, reviews and analytics | **Partial.** The structural model matches Command Violet strongly. Actual visual density, horizontal-nav discoverability, long form/editor behavior, and 320px overflow remain unproven. Some controls use text-symbol icons (`▦`, `↗`, etc.) rather than the reference’s real icon system. |
| `/admin`, `/admin/{overview,applications,sellers,products,taxonomy,orders,feedback,finance,analytics,audit,promotions,accounts}` | [ ] persistent grouped governance rail; [ ] sticky command bar; [ ] priority queues before secondary work; [ ] dense records/statuses | [ ] rail becomes horizontal nav; [ ] metrics reflow 4→2→1; [ ] subnav remains usable | API-bound search, review visibility, product moderation/publication, seller lifecycle, finance review, taxonomy governance, and feed retries. Important mutations use `ConfirmationDialog`. | **Partial.** Command Violet composition is well represented in source, but must be screenshot-tested for small mobile nav/subnav overlap and record-row reflow. CSS contains repeated global selector blocks, increasing cascade-regression risk. |
| `/admin/products/add`, `/admin/products/brands/create`, `/admin/products/categories/create`, `/admin/products/subcategories/create` | [ ] same Admin shell plus focused taxonomy/product guidance | [ ] same shell reflow as Admin | Existing AdminDashboard API-backed taxonomy/create controls | **Fail / interaction gap.** These direct page modules render `AdminDashboard` without `RoleProtectedWorkspace`, unlike `/admin` and `/admin/[section]`. They can expose a workspace shell before API denial and are not compositionally equivalent to protected admin routes. |
| Global loading, error, 404, role gate | [ ] centered recoverable state with direct next action | [ ] padded, single-column action stack | retry, route reset, navigation, session recheck | **Source-complete, render unverified.** Check focus landing after reset/retry and mobile copy wrapping. |

## API-backed control confirmation

| Surface | Confirmed remote contract-backed controls |
| --- | --- |
| Customer | Catalog/taxonomy/products/stores/deals reads; cart persistence and line mutations; checkout with idempotency key and selected saved address; wishlist save/remove; addresses create/update/remove/default; orders/tracking; eligible review submission; session/logout. |
| Seller | Owned profile, products, stock, variants, gallery images, classification/proposals, promotions, fulfillment transitions, finance review requests, notifications, reviews, analytics. |
| Admin | Search, products/publication/moderation, sellers/applications, orders, reviews/visibility, finance review, taxonomy/proposals, promotions, accounts, analytics, audit. |
| Auth | Login/register and seller application. Admin registration is intentionally an informational provisioning route, not a mutation control. |

Allowed non-remote interactions are correctly bounded: route navigation, UI-only filtering before loaded records, focus/drawer/menu state, and recently viewed stored locally with explicit “saved in this browser” copy. No visible action was found that falsely claims payment execution, delivery integration, or a remote operation it does not perform.

## Highest-priority completion gaps

1. **P0 — Protect the four nested Admin product routes** with the same role gate as all other Admin routes; then verify unauthenticated and wrong-role visual states.
2. **P1 — Restore customer header continuity** on product detail, deals, store directory, and public-store routes: the reference contract calls for logo, real search, account, wishlist, and bag wherever this is an Explore surface. Only expose controls that reuse the existing contracts.
3. **P1 — Perform desktop and narrow-mobile screenshot comparison** at least at 1440px and 390px for every row above, including open mobile navigation, cart drawer, dialog, empty/error, and pending states. This audit cannot substitute source reading for rendered parity.
4. **P1 — Fix client test gate before visual acceptance.** `npm.cmd test` ran 326 tests: **319 pass, 7 fail**. At least the Admin operate-workspace and storefront accessibility source-structure expectations are stale against the current composition; determine whether tests or behavior need correction without weakening the visual/accessibility contract.
5. **P2 — Replace account wishlist text-token imagery** with the verified product image source/fallback pattern used by catalog cards, then check image crop and accessible alt behavior.
6. **P2 — Inspect mobile operational density.** The Seller/Admin rails intentionally become horizontal scrollers below 900px; capture keyboard focus, active visibility, product/taxonomy forms, tables/records, and nested Admin products subnav at 700px and 420px.

## Required visual acceptance run

- Capture each route family in loading, loaded, empty, error/retry, and representative pending/confirmation states.
- Compare reference and current screenshots at equal desktop and narrow-mobile viewports; check header/rail position, type scale, spacing, borders, contrast, radius, image crop, scrollbars, and focus rings.
- Exercise keyboard: skip links, menu/drawer/dialog Escape and focus return, form error recovery, and horizontal navigation.
- Re-run `npm.cmd test`, `npm.cmd run typecheck`, and `npm.cmd run lint` after the current red tests are resolved. This run did not reach typecheck/lint completion because the required test gate failed first.

## Audit limitations

No client source, tests, configuration, server files, assets, environment values, database state, or deployment state was modified. This report is the only audit artifact created.
