# NexaMart product context

## Architecture
- `client/`: Next.js 16 / React 19 application.
- `server/`: Hono API with Drizzle/PostgreSQL.
- Customer, seller, and admin authority is always derived from the session; client identifiers never grant authority.
- The client and API are independently deployable applications. Browser authentication uses the client-origin `/api/*` proxy boundary.

## Implemented, contract-backed capabilities

### Customer
- Catalog search by published product, active brand, and active category.
- Category, subcategory, brand, and `newest` catalog filters.
- Public product detail, gallery, stock state, safe variant IDs/options/price/stock.
- Variant-aware cart and checkout request path; server-side seller eligibility and atomic stock reservation.
- Wishlist, customer addresses, order history, cart recovery, and checkout idempotency recovery.
- Recently viewed is browser-local only; it is not account-synced.

### Seller
- Owned catalog, product details, variants, gallery, stock, profile, promotions, taxonomy proposals, reviews, analytics, and notifications.
- Product moderation outcome and corrective guidance.
- Fulfillment lifecycle: `pending → processing → packed → shipped → delivered`, with existing cancellation/return terminal paths.
- Seller notification list/read state, emitted transactionally for moderation decisions and new owned order lines.
- Seller finance is a payout-review workflow only. It does not transfer, settle, capture, or pay money.

### Admin
- Seller application and seller lifecycle moderation.
- Product moderation: approve, reject, request changes; reason, exact revision conflict protection, and audit record.
- Taxonomy/category/subcategory/brand governance and seller proposals.
- Order oversight and line detail.
- Finance payout-review decisions only; no payout execution.
- Reviews, promotions, accounts, analytics, and audit trail.

## Truth boundaries
- Do not invent metrics, ratings, seller SLA, delivery tracking, carrier integration, payment status, money transfer, recommendations, countdowns, or external messaging.
- Do not surface a control without a verified API contract and ownership/RBAC rule.
- Payment provider, delivery provider, and n8n/workflow automation are not implemented.
- Database migrations `0015`, `0019`, `0020`, and `0021` are deliberately unapplied. Do not claim live database behavior until an authorized target-database migration/readback is complete.

## Non-negotiable product rules
- Seller data is owner-scoped. Admin authority is session-derived and audited.
- Important mutations use confirmation, row-scoped pending state, error/retry feedback, and accessible dialogs.
- Product visibility and purchase availability require publication and an active seller.
- UI has distinct loading, empty, error, success, and no-results states when an API feed supports them.
