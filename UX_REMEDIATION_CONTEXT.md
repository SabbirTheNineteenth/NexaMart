# NexaMart UI remediation context

## Authorization and scope
The owner authorized continuous frontend remediation across Customer, Seller, Admin, and Auth route families. This program is frontend-first. It may improve visual hierarchy, component semantics, responsive layout, keyboard affordances, and subtle motion, but it must not invent commercial claims, metrics, integrations, routes, or server contracts.

## Non-negotiable visual system
- Preserve NexaMart identity and the owned monogram.
- Obsidian Orchid: dark plum/obsidian foundation; royal-purple and orchid accents; warm high-contrast text; restrained 8–14px radii; 1px surface borders.
- Customer routes are **Explore** surfaces: search, taxonomy, collection clarity, product-first hierarchy, compact useful controls.
- Seller and Admin routes are **Operate / Monitor** surfaces: dense real work queues and usable actions; no centered marketing heroes or fabricated summaries.
- Auth is a **Configure** surface: focused split layout, truthful role copy, clear form hierarchy.
- Motion is 140–220ms opacity/transform continuity only for state changes; every nonessential animation honors `prefers-reduced-motion`.

## UX standards
1. Every visible control must have a real existing route/API behavior, or be omitted.
2. Preserve all loading, error, empty, pending, retry, confirmation, RBAC, focus, keyboard, and reduced-motion behavior.
3. Buttons must have useful labels, a 44px minimum touch target where feasible, visible hover/focus/disabled states, and no duplicated or dead actions.
4. Use spacing rhythm deliberately; remove accidental card nesting, oversized gaps, and grid stretching. Keep desktop density compact and mobile layouts readable at 700px, 420px, and 390px.
5. Keep commerce claims truthful: no fabricated ratings, savings, delivery, payment, inventory, recommendations, seller metrics, or countdowns.
6. Use real loaded data only. Never add placeholder dashboard records, charts, activity, or counts.

## Delivery protocol
- 30 bounded work units are scheduled as 3 waves of 10 isolated worktrees; no shared-file concurrent writers.
- Each writer owns only named files, writes a focused regression test first, proves RED then GREEN, runs focused tests/typecheck, records its result, and makes one local commit.
- Parent reviews every commit, integrates sequentially, runs client gates after every batch, then performs rendered responsive QA.
- Existing uncommitted progress documents and artifacts belong to the user and must not be staged, rewritten, or removed.

## Wave 1 route ownership
1. Storefront explore (`Storefront.tsx`, storefront styles/tests)
2. Product detail (`ProductDetail.tsx`, product detail styles/tests)
3. Deals (`DealsDiscovery.tsx`, deals styles/tests)
4. Stores (`StoreDirectory.tsx`, `PublicStorePage.tsx`, store styles/tests)
5. Account (`AccountWorkspace.tsx`, account styles/tests)
6. Seller workspace shell/overview (`SellerDashboard.tsx`, seller styles/tests)
7. Seller forms/taxonomy/asset editors (seller feature files excluding dashboard; scoped styles/tests)
8. Admin workspace shell/overview (`AdminDashboard.tsx`, admin styles/tests)
9. Admin taxonomy/forms (`AdminTaxonomyManagement.tsx`, `AdminCategoryManagement.tsx`, scoped styles/tests)
10. Auth plus shared primitives (`RoleAuth.tsx`, auth/global style and tests; no other route component files)

## Acceptance evidence
A completed slice has: scoped test evidence, client typecheck, lint, no semantic diff corruption, and parent integration. A visually complete route additionally needs rendered desktop and narrow-width evidence. Do not call the whole project complete until all 30 units, full gates, and rendered route-family QA are complete.
