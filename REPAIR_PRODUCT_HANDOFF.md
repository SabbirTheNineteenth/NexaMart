# Product-detail repair handoff

## Finding

Parent gate test #202 was a stale source assertion, not a variant behavior failure. `ProductDetail` continues to expose public variant IDs, selects variants by ID, uses selected variant price and stock, and passes `{ id, price }` to the existing cart API contract. The variant section gained the scoped `styles.variantPanel` class, so its `className` is no longer exactly `"product-variants"`.

## Change

Updated only `client/tests/product-detail-gallery-variants.test.ts` to assert the current scoped-class expression while preserving the labelled variant-section accessibility contract.

## Verification

- Passed: `node --test tests/product-detail-gallery-variants.test.ts` (3/3).
- Blocked by absent local dependencies: `npm.cmd test -- tests/product-detail-gallery-variants.test.ts` (`tsx`); `npm.cmd run typecheck` (`tsc`); `npm.cmd run lint` (`eslint`); `npm.cmd run build` (`next`). No dependency installation or environment changes were made.
