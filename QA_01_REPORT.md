# QA-01 integrated gate report

Date: 2026-09-16 (Asia/Dhaka)  
Scope: post UI-01..UI-05, read-only QA. No credentials, login, mutation, seed, migration, deploy, commit, or source edit was performed. The only durable file created is this report.

## Environment and commands

Pre-existing processes were found and left running: API `node ... server/src/index.ts` on `localhost:3000` (PID 29288) and Next client on `localhost:3002` (PID 4500). No process was started or stopped by QA.

| Exact command | Status |
| --- | --- |
| `npm test` (client, PowerShell) | BLOCKED before script execution: local `npm.ps1` execution policy. |
| `npm.cmd test` (client) | PASS — 314 tests, 0 failures (46.808 s). |
| `npm.cmd run lint` (client) | PASS (exit 0). |
| `npm.cmd run typecheck` (client) | PASS (exit 0). |
| `npm.cmd run build` (client) | FAIL (exit 1): `NEXAMART_API_URL is required in production`. |
| `npm.cmd test` (server) | PASS — 542 tests, 0 failures (42.732 s). |
| `npm.cmd run lint` (server) | PASS (exit 0). |
| `npm.cmd run typecheck` (server) | PASS (exit 0). |
| `npm.cmd run build` (server) | PASS (exit 0). |

## Live HTTP smoke

| URL(s) | Observed result |
| --- | --- |
| `http://localhost:3000/api/health`, `http://localhost:3002/api/health` | 200 JSON: `{"ok":true,"service":"nexamart"}`; client proxy works. |
| `http://localhost:3000/api/catalog/products`, `http://localhost:3002/api/catalog/products` | 200 JSON; 8 public products returned. |
| `http://localhost:3000/api/catalog/taxonomy`, `http://localhost:3002/api/catalog/taxonomy` | 200 JSON. |
| `http://localhost:3000/api/catalog/products/demo-store-auralis-orbit-headphones` | 200 JSON product detail, including stock/variant/gallery contract fields; 0 variants and 1 gallery image in this observed record. |
| `http://localhost:3000/api/catalog/products?sort=newest` | 200. |
| `http://localhost:3000/api/catalog/products?sort=popular` | 400; unsupported sort is rejected. |
| `http://localhost:3000/api/catalog/products/qa-01-nonexistent-slug`, proxy equivalent | 404. |
| `http://localhost:3000/api/seller/analytics`, proxy equivalent | 401 without a session — seller authority is guarded. |
| `http://localhost:3000/api/admin/analytics`, proxy equivalent | 401 without a session — admin authority is guarded. |
| Client routes `/`, `/products/qa-01-nonexistent-slug`, `/stores`, `/seller`, `/seller/catalog`, `/admin`, `/admin/products`, `/login`, `/login/seller`, `/login/admin`, `/register`, `/register/seller`, `/register/admin` | All returned 200 HTML route shells. No authenticated workflow was exercised. |

## Layout and truth-boundary evidence

- Narrow-width source evidence: `client/src/app/globals.css` contains 37 `@media(max-width:760px)` rules and one `@media(max-width:520px)` rule, covering storefront, seller/admin, auth, cards, rails, dialogs, and grids. It also contains 8 `@media(prefers-reduced-motion:reduce)` rules. No browser is available in this session, so this is not a rendered viewport inspection.
- Payout wording is correctly bounded in seller/admin source: review/request only; confirmation text explicitly says it does not execute, transfer, or settle money.
- Seller fulfillment tests and source contain no carrier, delivery-partner, payment, or settlement claim. Admin order oversight labels payment/delivery changes unavailable.
- Reviews are constrained to delivered purchases in the customer flow and are represented as returned records. The public catalog response does include `rating` and `reviews` fields; their real-world provenance was not independently database-verified, and the context expressly prohibits claiming target-database behavior before authorized migration/readback.
- Countdown/promotion presentation is conditional on a server-provided promotion, effective price, and future valid `endsAt`; invalid, missing, non-discounted, and expired offers are hidden. No default-catalog promotion/countdown was observed in the live response.
- No evidence of payment-provider, delivery-provider, carrier, payout-execution, fake recommendation, or fake-metric integration was found in the exercised public surface. Auth-gated operational metric pages were deliberately not bypassed.

## Result, limits, and safe next repair

QA-01 is partially blocked for release readiness only by the client production build configuration: supply an authorized exact HTTPS `NEXAMART_API_URL` in the intended production build environment, then rerun `npm.cmd run build` from `client`. Do not hard-code or invent a URL.

Visual mobile rendering, keyboard traversal, and authenticated seller/admin UI behavior remain unverified because no browser automation was available and this run did not use credentials. The live local database was observed only through public read endpoints; it is not evidence of an authorized target-database migration/readback.
