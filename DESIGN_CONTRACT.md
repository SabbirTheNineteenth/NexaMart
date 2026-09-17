# Obsidian Orchid design contract

## Status
**Approved by product owner:** Obsidian Orchid is the immutable visual direction for the next frontend implementation program.

## Visual posture
- Original premium commerce system; dark obsidian/plum foundation with controlled royal-violet and orchid accents.
- Warm pearl text and surfaces only where they improve hierarchy.
- NexaMart's existing monogram is the only product mark.
- High-density operational layout for admin/seller. Editorial explore composition for storefront. Focused split composition for authentication.
- The reference image is an art-direction and hierarchy contract, not a source for copied names, metrics, wording, or third-party branding.

## Tokens
- Foundation: near-black plum / charcoal, not pure black.
- Accent: NexaMart royal purple; orchid is a secondary emphasis, never a rainbow gradient.
- Surface: layered dark panels with crisp 1px borders; low-blur elevation only.
- Typography: compact, high-contrast hierarchy; avoid oversized empty hero sections on operational surfaces.
- Radius: restrained, generally 8–14px; cards are not decorative containers.
- Motion: 140–220ms opacity/transform continuity on storefront filters, product interactions, bag/wishlist feedback, and panel transitions. No looping decoration. `prefers-reduced-motion` disables nonessential motion.

## Surface contracts

### Customer storefront — Explore
- Header: logo, real search, account, wishlist, bag.
- Browse: category/brand/newest filters, truthful stock and variant selection, clear no-results/retry states.
- Product cards and detail must use returned product information only.
- Recently viewed must state that it is saved in this browser.
- Do not show unsupported ratings, recommendations, payment badges, shipping promises, artificial discounts, or countdowns.

### Seller workspace — Operate
- Persistent compact sidebar: overview, catalog, inventory, fulfillment, promotions, reviews, profile, taxonomy, notifications, finance.
- Prioritize owned workflow queues, moderation feedback, stock states, notifications, and guarded fulfillment transitions.
- Finance wording is "review" / "request" only; never "payout sent", "settled", or a transfer claim.

### Admin control room — Operate / Monitor
- Persistent sidebar: seller applications, sellers, products, taxonomy, orders, feedback, finance, analytics, audit, promotions, accounts.
- Put moderation, approvals, taxonomy governance, and audit context ahead of decorative summaries.
- Show only real counts/records from loaded feeds. Every important state action requires accessible confirmation.

### Authentication — Configure
- Customer, seller, and admin retain the same split visual system, with role-specific truthful copy.
- No social login. Admin registration remains provisioning-only.
- Form actions follow their panel color/contrast system, not an ornamental logo gradient.

## Acceptance criteria for every visual slice
1. Use only contract-backed controls and truthful copy.
2. Preserve keyboard, focus, reduced-motion, loading/error/empty states.
3. Render dedicated route workspaces; never hide a monolithic dashboard with CSS.
4. Test at desktop and narrow mobile widths before calling a slice visually complete.
5. Add a focused regression before changing a visible structural contract.
