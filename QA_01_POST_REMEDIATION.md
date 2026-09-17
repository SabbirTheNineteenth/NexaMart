# QA-01 post-remediation verification

Date: 2026-09-16 (Asia/Dhaka)  
Scope: read-only verification of the three QA-01 remediation items and customer catalog truth-boundary scan. No source, ledger, deployment, seed, migration, commit, credential, login, or mutation action was performed. This report is the sole file created by this run.

## Result

**PASS — no remaining blocking findings in the requested remediation scope.**

| Prior finding | Verification result | Evidence |
| --- | --- | --- |
| `PublicStorePage` showed countdown/remaining-time behavior | **Eliminated.** No `setInterval`, `setTimeout`, `countdown`, `remaining`, `endsAt`, promotion, or timer reference remains in `client/src/features/catalog/PublicStorePage.tsx`. The public store product cards now render only server-returned image, name, and current/effective price. | Current source scan; `client/tests/customer-deals-discovery.test.ts` and full client suite passed. |
| Admin global-search Open actions did not reach their operational workspaces | **Eliminated.** Seller result links use `/admin/sellers`; product result links use `/admin/products`; order result links use `/admin/orders`. No fragment-only result links remain. | `client/src/features/admin/AdminDashboard.tsx`; `client/tests/admin-global-search.test.ts` assertion passed in the full suite. |
| Deals discovery, store directory, and public store lacked the Obsidian Orchid Explore surface | **Eliminated.** `DealsDiscovery`, `StoreDirectory`, and `PublicStorePage` each apply `customer-experience orchid-explore`. The current stylesheet supplies the shared dark obsidian/plum, orchid-border, orchid-focus, surface, responsive, and reduced-motion rules for those three route classes. | `client/src/features/catalog/DealsDiscovery.tsx`, `StoreDirectory.tsx`, `PublicStorePage.tsx`, and `client/src/app/globals.css`; full client suite passed. |

## Customer catalog claim scan

Reviewed the current customer catalog implementations: `Storefront.tsx`, `ProductDetail.tsx`, `DealsDiscovery.tsx`, `StoreDirectory.tsx`, `PublicStorePage.tsx`, and `deals-refresh.ts`.

- No public ratings/review presentation found (`product.rating`, `product.reviews`, “Customer reviews”, and “Popular with customers” absent).
- No public countdown, remaining-time, or interval behavior found. `DealsDiscovery` retains a one-shot `setTimeout` only to refetch server-backed deals at the earliest supplied promotion expiry; it renders neither a countdown nor remaining time and is not present in `PublicStorePage`.
- No savings/was-price/original-price presentation found.
- No recommendation claims found.
- No payment/provider/badge claims found.
- No delivery, carrier, arrival, shipping-promise, or free/fast-shipping claims found. Storefront's shipping-address references are checkout address-selection controls, which are contract-backed and do not claim delivery service or timing.

## Gates and local public HTTP smoke

| Check | Exact result |
| --- | --- |
| `npm.cmd test` from `client` | **PASS** — 321 tests, 0 failures (6.818 s). |
| `npm.cmd run lint` from `client` | **PASS** — exit 0. |
| `npm.cmd run typecheck` from `client` | **PASS** — exit 0. |
| `GET http://localhost:3002/api/catalog/products` | **200** — 8 public products. |
| `GET http://localhost:3002/api/catalog/stores` | **200** — 1 public store (`demo-store`). |
| `GET http://localhost:3002/api/catalog/products?deals=active` | **200** — 0 active deals at observation time. |
| `GET http://localhost:3002/`, `/deals`, `/stores`, `/stores/demo-store` | **200 HTML** for every route. |

No production build was run: the prior QA report already establishes that this environment lacks the required authorized production `NEXAMART_API_URL`, and this verification did not invent or set configuration. No browser capture tooling was available, so rendered visual inspection, narrow-width layout, keyboard traversal, and authenticated admin interaction were not exercised; those are non-blocking limits for this source-and-public-HTTP post-remediation verification.

## Remaining blocking findings

None within the requested QA-01 post-remediation scope.
