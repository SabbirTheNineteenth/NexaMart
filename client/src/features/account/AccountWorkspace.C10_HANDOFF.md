# C10 `/account` handoff

## Scope

Completed the bounded customer-account parity slice. `AccountWorkspace` retains the existing API-bound account, orders, addresses, wishlist, review, tracking, and mutation contracts; no authenticated account data was created or substituted.

## Session and state behavior

- `/auth/me` renders the signed-out entry surface only for the API-authoritative `401` response.
- Non-`401` session failures render a truthful retryable account-resolution error rather than presenting the visitor as signed out.
- Account loading, empty, error, retry, and pending states remain independent after the API supplies an authenticated account.
- The signed-out, loading, and resolution-error surfaces use a compact route-local Orchid panel and remain responsive at captured widths.

## TDD and local QA evidence

- RED: `c10-account-session-boundary.test.ts` was 0/2 before the session boundary/state frame.
- GREEN: the original focused account suite passed 24/24. On integration, `c10-account-session-boundary.test.ts` passed 2/2; an unrelated stale Storefront assertion in `customer-experience-system.test.ts` failed and is excluded from this scoped C10 acceptance.
- `npm.cmd run typecheck` passed; `npm.cmd run lint` completed with one pre-existing `no-img-element` warning and no errors.
- Existing production-build evidence is recorded in the customer worktree. Its `/account` captures received a real proxy `500`, so they verify only the retryable error state; no session or content was fabricated.

## Remaining evidence

A healthy authoritative local account response and legitimate session are still needed to accept signed-out/authenticated rendered states at 1440, 700, 420, and 390.
