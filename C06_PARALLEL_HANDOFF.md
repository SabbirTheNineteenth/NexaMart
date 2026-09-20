# C06 parallel handoff

## Completed slice

The public Product Detail retry error is now scoped to the slug that produced it. If navigation starts for a different product while an earlier request has failed, that next route renders its existing truthful loading state instead of briefly showing the previous product's error and retry action.

Only `client/src/features/catalog/ProductDetail.tsx` changed in production code. The existing catalog request, cart, wishlist, loading, error, retry, and authenticated-save behavior are unchanged. No authenticated wishlist success was asserted or fabricated.

## TDD and checks

- Added `client/tests/c06-detail-stale-error-state.test.ts` first. Its normal `tsx` RED run was blocked because this worktree initially had no installed `tsx` package. After the repair, the focused assertion passes with `node --experimental-strip-types --test tests/c06-detail-stale-error-state.test.ts` (1/0).
- Attempted `npm.cmd ci --ignore-scripts` to restore locked dependencies. The shared host left an incomplete dependency tree: `tsx` has no entry point, and `tsc`/`eslint` commands remain unavailable.
- `npm.cmd run typecheck` — blocked: `tsc` not recognized.
- `npm.cmd run lint` — blocked: `eslint` not recognized.
- Local-QA build was attempted with `NEXAMART_API_URL=https://api.example.invalid`; Next started its optimized build but did not complete and no `.next/BUILD_ID` was produced.
- `127.0.0.1:3000` had no reachable public product or auth listener, so no 1440/700/420/390 public captures were made. No credentials or cookies were used.

## Remaining acceptance blocker

The matrix’s authenticated wishlist saving/Saved visual acceptance still requires an owner-authorized customer session on a healthy current-build listener. It remains intentionally untested here.
