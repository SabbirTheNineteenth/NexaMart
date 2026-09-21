# Final UI/backend contract audit

**Scope:** static, read-only audit of the current `Storefront`, `ProductDetail`, `AccountWorkspace`, `SellerDashboard`, `AdminDashboard`, and `RoleAuth` implementation on 2026-09-21. This report does not claim that a deployed service, cookie, database, or seed has been exercised.

## Result

**Confirmed missing backend contracts: none.** Every visible control in scope that performs a server operation has a mounted route, an appropriate session/RBAC boundary where required, a repository-backed domain record or explicitly local-only state, and a rendered pending/success/error or retry state. No endpoint, migration, seed, payment-provider integration, or DB edit is justified by this audit.

`lib/api.ts` sends cookies (`credentials: include`) and normalizes transport/HTTP errors; the server mounts the matching routes under `/api`, resolves `nexamart_session`, and rejects unsafe cookie-bearing requests from an unapproved origin/referer.

## Control-to-contract matrix

| Surface and visible control family | Endpoint / local behavior | Session and persistence | Error / state evidence |
| --- | --- | --- | --- |
| **Storefront** — search, department/subcategory/brand/sort, catalog/new-arrivals reload | `GET /catalog/products` with `q`, `category`, `subcategory`, `brand`, `sort=newest`; `GET /catalog/taxonomy` | Public reads; `products`, taxonomy records, seller/publication filtering in catalog service | loading, empty, alert, and retry states for catalog, taxonomy, and arrivals |
| Storefront — availability/product-type facets and filter clear | Client-side projection of the fetched catalog; URL query state for server-supported discovery filters | No session or persistence required | local selected/empty state; not a backend operation |
| Storefront — product/store/category/navigation links, mobile nav, bag open/close | Client navigation/local UI only; product and store destinations have public catalog routes | No write | local state / browser navigation |
| Storefront — save piece | `POST /wishlist/items` | customer session; `wishlist_items` owner-scoped | saving, success, and error including sign-in recovery |
| Storefront — add, change quantity, remove, clear bag (via `useCart`) | `GET/POST/PATCH/DELETE /cart/items` and item path | customer session; `cart_items`. Guest bag is deliberately `localStorage` until sign-in handoff | per-line pending/error/retry; cart-load retry; guest handoff state |
| Storefront — choose saved address and place order | `GET /addresses/`; `POST /checkout/orders` with `Idempotency-Key`; then cart clear | customer session; `addresses`, `orders`, `order_items`, address snapshot, order-event/commission records | address loading/retry, disabled checkout, checkout message, cart-cleanup recovery. Server validates stock/address/seller conflicts. |
| Storefront — recently viewed/remove/clear | Browser-only `localStorage` (`nexamart.recently-viewed`) | Explicitly not account-synced; no backend contract implied | local update; storage failures are safely ignored |
| **ProductDetail** — load/retry product, gallery and variant selection | `GET /catalog/products/:slug`; gallery and variants are returned with public product payload | Public read; `products`, `product_variants`, `product_gallery_images` | loading/404-or-transport alert/retry; image fallback; selected variant local state |
| ProductDetail — add to bag/save piece | Same cart and wishlist contracts as Storefront | customer persistence for authenticated bag/wishlist; guest bag local as above | pending/success/error and sign-in guidance; stock is also enforced server-side on cart/checkout |
| **AccountWorkspace** — resolve account/sign out | `GET /auth/me`; `POST /auth/logout` | session record is resolved/revoked; logout deletes the cookie | authenticated/signed-out/transport-error views; pending/error logout state |
| AccountWorkspace — orders and fulfillment timeline | `GET /checkout/orders`; `GET /checkout/orders/:id/tracking` | customer session and ownership check; `orders`, `order_items`, `order_events` | loading, empty, per-order tracking loading/error/retry |
| AccountWorkspace — saved-piece list/remove | `GET /wishlist/items`; `DELETE /wishlist/:productId` | customer session; `wishlist_items` owner-scoped | loading/error/retry; per-item removing/error |
| AccountWorkspace — address create/edit/default/delete | `GET/POST /addresses/`; `PATCH /addresses/:id`, `PATCH /addresses/:id/default`, `DELETE /addresses/:id` | customer session; owner-scoped `addresses`, one-default invariant | form validation, saving/success/error, 404 recovery text, remove confirmation |
| AccountWorkspace — eligible purchase reviews/submit | `GET /reviews/eligible`; `POST /reviews/` | customer session; delivered owned `order_items`; `product_reviews` has one-review-per-customer/order-item invariant | load retry; submission pending/success/error |
| **SellerDashboard** — section navigation, product filter/clear, create/edit dialog visibility, confirmations | Browser navigation and local UI state; no mutation until a child form is submitted | No backend operation by itself | local selected/filter/confirmation state |
| SellerDashboard — owned catalog, stock, product editor/assets/submission | `GET/POST/PATCH/DELETE /seller/products`; stock, variants, gallery, and submit-for-review subpaths | seller session and ownership checks; `products`, variants, gallery images, moderation fields/audit/notifications as applicable | workspace loading/error/retry; per-stock pending/success/error; editor/form error states |
| SellerDashboard — taxonomy options, classification, proposals | `GET /seller/taxonomy/options`, proposals; classification patch; proposal create/delete | seller session/ownership; canonical taxonomy plus `taxonomy_proposals`; audited governance mutations | loading/error/retry and form/action feedback |
| SellerDashboard — promotions | `GET/POST/PATCH/DELETE /seller/promotions` | seller session/ownership; `promotions`; server-priced eligibility at catalog/cart/checkout | workspace error/retry plus editor/form feedback |
| SellerDashboard — fulfillment | `GET /seller/orders`; `PATCH /seller/order-items/:id/fulfillment` | seller session; owned `order_items`, `order_events`, notifications | confirmation, pending/success/error and retry; server rejects invalid transition/conflict |
| SellerDashboard — analytics, reviews, profile, notifications | `GET /seller/analytics`, `/seller/reviews`, `/seller/application`, `/seller/notifications`; `PATCH /seller/profile`, notification read | seller session; derived order/review data, `seller_profiles`, `seller_notifications` | independent loading/error/retry states and mutation feedback |
| SellerDashboard — request payout review | `GET /seller/finance`; `POST /seller/finance/payout-requests` | seller session; commission/payout records and audit | confirmation, pending, feedback/error. This is **review-only**, not money movement. |
| **AdminDashboard** — dashboard records/search/filter/retry | `GET /admin/accounts`, products, sellers, orders, reviews, finance, analytics, promotions, audit records, search | admin session; read models over accounts, seller profiles, catalog, orders, reviews, promotions, finance, audit | independent loading/error/retry; abort guards prevent stale response replacement |
| AdminDashboard — seller status, product publication/moderation, review visibility | `PATCH /admin/sellers/:id/status`, `/admin/products/:id/publication`, `/moderation`, `/admin/reviews/:id/visibility` | admin session; seller/catalog/review records, revision/conflict controls, audit and seller notification where applicable | confirmation plus per-record pending/success/error/retry |
| AdminDashboard — payout review | `PATCH /admin/finance/payouts/:id/review` | admin session; `payout_records`, commission/audit records | confirmation, pending/error/feedback. “Approve review” does **not** transfer money. |
| AdminDashboard — canonical taxonomy and seller-proposal review (rendered child controls) | `GET/POST/PATCH /admin/taxonomy/*`, proposal review | admin session; category/subcategory/brand and proposal records; audited | child-level loading/error/retry/form feedback |
| **RoleAuth** — customer/seller login and customer registration | `POST /auth/login`, `POST /auth/register`; seller registration follows with `POST /seller/application` | account + HttpOnly session; seller profile/application is persisted pending approval | submit pending; normalized error; wrong-role recovery. Seller application failure is explicitly surfaced after account creation. |
| RoleAuth — admin registration route and tabs/links | No self-registration call; navigation only | Intentional policy: admin accounts are provisioned outside this UI | explanatory static state; no missing public admin-create endpoint |

## Deliberately unverified (not findings)

| Area | What static inspection proves | What remains unverified without runtime data/environment |
| --- | --- | --- |
| **Session** | Auth routes create/revoke server session records and set/delete an HttpOnly, SameSite=Lax cookie; guarded mutations/read scopes are present. | Actual browser cookie delivery across the configured client/API origins, expiry/revocation readback, production `Secure` behavior, and post-login guest-cart handoff. Do not infer these from source alone. |
| **Deals / promotion pricing** | Seller promotion CRUD exists; catalog exposes server-computed effective price and checkout persists promotion snapshots. Storefront has no independent “deal claim” mutation in this scope. | An active time-windowed promotion populated in a real database, its visibility in catalog/detail, and final repricing/eligibility at checkout. This is a test-data/runtime gap, **not** evidence of a missing endpoint. |
| **Demo data** | Schema, repositories, and demo-seed tests/files are present. | That any local/deployed database was migrated/seeded, or contains the roles, addresses, products, variants, approved seller, delivered order, review, promotion, payout, notification, and audit records needed to exercise every rendered state. |

## Ranked next backend slices

These are verification slices, not authorization to add contracts or change data.

1. **Session lifecycle smoke contract:** registration/login, `/auth/me`, logout, expiry, RBAC denial, cross-origin cookie/origin behavior, and guest-cart merge readback.
2. **Deal-to-checkout scenario:** use a controlled active product promotion and prove catalog/detail effective price, cart eligibility, checkout snapshot, and finance/audit readback agree.
3. **Role-complete demo fixture/readback:** provision the minimum customer/seller/admin data chain through delivered review, seller fulfillment, moderation/notification, and payout-review visibility; verify UI error and empty states separately.
4. **Concurrency/error contract regression:** stale moderation revision, duplicate/invalid payout review, invalid fulfillment transition, inventory conflict, and checkout idempotency using the existing response contracts.

No backend implementation slice should start by adding a route, persistence table, seed, or payment execution based on this audit. First turn one of the unverified runtime cases above into a failing contract test or observed production defect.
