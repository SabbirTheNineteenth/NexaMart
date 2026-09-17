# UI-to-backend contract matrix

Created after QA-01 visual acceptance on 2026-09-17. This is an implementation inventory, not a claim that a remote deployment has been exercised. Client calls use `client/src/lib/api.ts`; every unsafe browser request is covered by the server's session/origin guard in `server/src/app.ts`.

| Visible action family | Client contract | Existing server layer / RBAC | Persistence and verification | Gap / migration |
| --- | --- | --- | --- | --- |
| Explore, product, deals, stores, public store | `GET /catalog/products`, `/catalog/products/:slug`, `/catalog/stores`, `/catalog/stores/:slug`, `/catalog/taxonomy` | `catalog.routes.ts` → `catalog-service.ts`; public reads | Catalog/store/taxonomy repositories; client catalog/discovery tests | No missing contract or migration identified. |
| Customer auth and role entry | `POST /auth/register`, `/auth/login`, `/auth/logout`; `GET /auth/me`; seller application `POST /seller/application` | `auth.routes.ts` / `seller-application.routes.ts` → auth/session services; session identity plus seller workflow | Auth/session and seller records; auth route/service tests | No migration identified. Admin registration correctly has no self-provisioning mutation. |
| Bag and checkout | cart item GET/POST/PATCH/DELETE; `POST /checkout/orders`; order and tracking GET | `cart.routes.ts`, `order.routes.ts` → cart/order services; customer session | Cart/order/order-item records, idempotency key, seller notifications; cart/order tests | No provider/payment claim. No missing migration. |
| Wishlist and account | wishlist GET/POST/DELETE; addresses CRUD/default; customer orders/tracking; eligible reviews and review POST | wishlist, address, order, review route/service modules; customer-only ownership | Wishlist/address/review/order records; customer UI and server route tests | No missing contract or migration identified. |
| Seller catalog and assets | seller products CRUD, stock, variants, gallery images | `seller.routes.ts` → `seller-catalog-service.ts`; approved seller and ownership checks | Product/variant/gallery records and revision controls; seller product asset/service tests | No missing contract or migration identified. |
| Seller operations | seller orders/fulfillment, analytics, queue, notifications/read, reviews, profile, promotions, taxonomy proposals, payout-review request | seller route modules and services; session seller scope | Order-item, notification, promotion, taxonomy and audit records; seller tests | Payout requests are review records only; no payment execution or migration is required. |
| Admin monitor/operate | dashboard, accounts, product publication/moderation, seller status, reviews, taxonomy governance, audit, finance review, orders, analytics, promotions, search | admin route modules and services; `RoleProtectedWorkspace` plus server admin checks | Admin, catalog, seller, audit, taxonomy, review and finance-review records; admin route/service tests | No missing contract or migration identified. Finance remains review-only. |
| Cross-cutting errors, pending, focus, retries | normalized HTTP messages in `lib/api.ts`; client-owned loading/error/retry and dialog state | Hono status responses, CSRF-style origin guard, session service | Client interaction/unit tests and server route tests | No backend persistence needed. |

## RBAC and implementation requirements

- Public catalog reads are intentionally anonymous. Customer resources are session-owner scoped. Seller mutations/read models are session-seller scoped. Admin actions require session-admin scope.
- Existing `/lib`, `/utils`, repositories, and `services/*-service.ts` layers are the required extension points for any future gap; route handlers must not bypass service ownership checks or audit paths.
- No schema migration or seed is authorized by this matrix because no current visible action lacks a persistence contract. If a new gap is found, first inspect the target schema and migration history, write a rollback/readback plan, then apply the smallest migration and verify live readback.

## Backend starting point

The first backend follow-through slice is a contract audit: execute the existing server test/typecheck gate and reconcile any actual route/service discrepancy found there. It must not add an endpoint, migration, seed, payment movement, or delivery-provider claim without a visible UI requirement and a RED regression.
