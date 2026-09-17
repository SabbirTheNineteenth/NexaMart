# NexaMart premium marketplace delivery brief

## Mission
Inspect and improve the existing `client/` (Next.js 16/React 19) and `server/` (Hono/Drizzle/PostgreSQL) applications in place. Do not rebuild or replace working architecture. Deliver a premium, responsive, production-ready multi-vendor marketplace that is truthful: no fake data, dead controls, payment claims, delivery-provider claims, or invented metrics.

## Operating rules
- Work in vertical, independently verified slices. Read existing tests and contracts first.
- Preserve authorization/ownership rules in the API; no frontend-only security enforcement.
- Preserve current purple NexaMart brand system and shared monogram.
- Keep Admin and Seller sidebar sections route-focused; do not restore a monolithic CSS-hidden dashboard.
- Every control must be API-backed or explicitly unavailable.
- Do not run a database migration without a separately recorded approval. Additive migrations may be created if required, but document them as unapplied.
- Do not deploy, commit, push, use credentials, or seed remote databases.
- Run focused tests before/after changes and full gates when a slice is complete.
- Respect pre-existing workspace changes; inspect them before editing.

## Required outcome
### Admin
- Premium, compact operational-control-room overview based on real data.
- Dedicated pages for Seller applications, Sellers, Orders, Feedback/review moderation, Finance, Analytics, Audit, Products, Taxonomy, Promotions, Accounts.
- Products parent with dedicated nested routes for brand/category/subcategory creation and product review/publish moderation.
- Seller application/status actions use protected API, confirmation for destructive/irreversible actions, strong loading/empty/error/success state handling.
- Orders show real records, customer/seller/items/status/timeline where supported. Do not fabricate payment, carrier, or delivery control.
- Audit filtering/search with safe data.

### Seller
- Dedicated route-focused sections: overview, analytics, profile, inventory, taxonomy, promotions, fulfillment, finance, reviews.
- Owned-only product CRUD/edit assets/variants, stock updates with validation, taxonomy classification/proposals, product review submission workflow, promotions, fulfillment status transitions, store profile. Do not give sellers publication rights.
- Add confirmation UI to every destructive action such as promotion deletion; dialogs must be accessible.
- Implement notifications only if a complete database/API/client vertical slice can be delivered safely; otherwise make no fake notification UI.

### Customer storefront
- Premium responsive header/search/category browsing/filters, product detail/gallery/variants, catalog real loading-empty-error states, public stores.
- Persistent cart and wishlist with truthful API errors/stocks, proper quantity behavior, checkout with address selection/validation and order confirmation/history.
- No fake payment gateway. Payments remain unpaid/pending if no provider exists.

### Cross-cutting
- Role-based and ownership boundaries remain server enforced.
- Form validation, accessible labels/focus/dialogs, keyboard states, responsive mobile layouts, no accidental overflow.
- Loading, empty, no-results, success, error and disabled states for data-driven interactions.
- Use existing service/API abstractions and types; avoid needless new dependencies.

## Known current facts
- Client and API local health currently return 200.
- Baseline full client gate passed: 276 tests, typecheck, lint, production build, diff check.
- Baseline server gate passed: 522 tests, typecheck, lint, build, diff check.
- Current repository has no commits and all contents appear untracked; never rely on history or commit.
- `README.md` says payment integration, delivery integration, n8n, and migration `0015_variant_cart_checkout.sql` are pending/external boundaries.
- Current pending local test change adds a RED expectation for an accessible confirmation before seller promotion deletion in `client/tests/seller-promotion-dashboard.test.ts`. Complete this requirement rather than reverting it.

## Final verification
Run independently:
- Client: `npm test && npm run typecheck && npm run lint && NEXAMART_API_URL=https://api.example.com npm run build && git diff --check`
- Server: `npm test && npm run typecheck && npm run lint && npm run build && git diff --check`
- Live local route checks only if the dev services remain running, without stopping user processes.
Report actual completed slices, exact test totals, and genuine external-service limitations.
