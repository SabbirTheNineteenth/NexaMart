# Storefront repair handoff

## Diagnosis and repair

The 12 assigned parent-gate failures were stale exact-source assertions after the integrated compact reference Explore layout. `Storefront.tsx` already retained the behavioral contracts: the skip link focuses the collection heading; the icon-only saved-pieces link still uses `headerWishlistPath(cart.authenticated)`; catalog requests clear `catalogLoaded`; empty states are based on post-facet `visibleProducts`; and availability/product-type facets correctly produce the no-results copy.

No Storefront behavior changed. The assigned focused test files now assert the current accessible markup, reference-layout classes, post-facet empty predicate, and CRLF/LF-independent source formatting. The account-shell assertion in the customer experience test was also updated to its existing CSS-module class expression.

## Verification

- Assigned focused tests: 26 passed, 0 failed.
- Broader tests that directly mention `Storefront.tsx`: 100 passed; 3 blocked/unrelated failures:
  - `cart-quantity-updates.test.ts` cannot resolve `react` because this worktree lacks `client/node_modules`.
  - Two assertions in non-assigned `customer-navigation-bag-flow.test.ts` still require LF-only source text; Storefront's Escape behavior is present and unchanged.
- Typecheck and lint are blocked by the same missing worktree dependencies (`react`, `next`, `eslint-config-next`, and Node type packages).
- Build starts but correctly stops because production requires `NEXAMART_API_URL`; no environment value was supplied or changed.

## Scope

Only the assigned storefront-focused test files and this handoff are modified. `Storefront.tsx` was inspected but intentionally not changed.
