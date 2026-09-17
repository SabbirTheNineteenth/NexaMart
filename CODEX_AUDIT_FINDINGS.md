# Independent audit findings for Codex

Read these verified findings before choosing the next implementation slices. These are read-only audits; no agent modified source.

## P0 customer
1. `client/src/features/catalog/Storefront.tsx:279-288`: checkout clears its idempotency key before cart cleanup. A cart-clear failure is presented as checkout failure and a retry can create another order. Retain the key until cleanup completes and show order-confirmed recovery state; write RED client regression first.
2. Variant purchase UI is intentionally read-only: `ProductDetail.tsx:161-166`; public catalog types/repository omit variant ID despite API support. Do not enable this without explicit approval to apply the existing required database migration `0015_variant_cart_checkout.sql`; that migration is documented unapplied.

## P0 seller
1. `SellerDashboard.tsx` currently renders every workspace regardless of route. Make each `/seller/[section]` route render only the active workspace instead of a CSS-hidden/monolithic dashboard, with focused loads and independent errors.
2. `server/src/modules/promotions/postgres-seller-promotion.repository.ts` promotion updates do not reject overlap with other active same-product offers. Ensure update computes effective dates, checks overlap excluding itself, returns 409, and covers partial/both-boundary collisions.
3. Product promotion deletion now has a red client test requiring an accessible confirmation dialog. Complete that before other UX work.

## P0 admin
1. Product moderation is only boolean publication. Full reject/request-changes/reason requires a new persisted moderation model and additive migration; create it only after other migration-free P0 safety fixes and leave it unapplied.
2. Current admin order/finance/promotion scopes are deliberately read-only. Do not fake execution controls; payout/order mutation policy requires data model + migration design.
3. Admin state changes lack confirmation UI. Introduce an accessible reusable confirmation primitive and use it for existing seller status, product publication, review visibility, and taxonomy archive actions without changing server authorization.

## P1 customer
- Account uses one Promise.all and can render a valid user as signed out if orders/addresses fails. Separate authentication from dependent loads.
- useCart conflates session resolution with cart hydration and can downgrade an authenticated user to guest state after a cart-read error. Separate them and add retry/error state.
- Storefront says search includes brands/departments but API only searches name. Expand server query or truthfully relabel.

## P1 seller
- Seller product slug conflict returns generic 500. Map unique violation to 409 and offer a prefilled editable slug input.
- Variant inventory and base product inventory report incompatible availability. Define and implement a consistent availability rule first.
- Seller notifications do not exist. Only add as a full transactionally persisted schema/API/UI vertical slice, not a fake shell.

## P1 admin
- Seller application/directory lacks search/filter/details; Admin catalog lacks queue search/filter/counts; audit lacks actor display and free-text search. Prefer existing-contract no-migration improvements before introducing new data models.

## External boundaries
Payments, delivery provider, n8n, production credentials/deployments are intentionally unavailable. Migration 0015 must not be applied without explicit approval.
