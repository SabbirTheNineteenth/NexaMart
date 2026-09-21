# Final account finish handoff

## Scope

Only the customer `/account` workspace, its module CSS, and account-specific test coverage changed. API paths, the credentialed session contract, and account-data types are unchanged.

## Completed behavior

- `/auth/me` remains authoritative: only its `401` produces the signed-out entry state; other failures retain the retryable account-load error.
- A new account request generation and abort controller prevent late account, order, address, wishlist, or review responses from replacing a newer session state. Each feed still owns its loading, error/retry, and empty state.
- Empty copy says explicitly that no account records are available; it does not supply example addresses, orders, saved products, payments, messages, or delivery data.
- Signed-in users can skip directly to the focusable account content. On narrow screens, account navigation remains horizontally reachable, record actions can wrap, and overview counts stack readably.

## TDD and verification

- RED: added `client/tests/final-account-finish.test.ts` before implementation. The intended new session-generation, abort, skip-target, local focus, and empty-state assertions were absent initially.
- GREEN: static focused acceptance checks and `git diff --check` pass after implementation.
- The repository's normal client test/typecheck commands could not run in this worktree because `client/node_modules` is absent and Node cannot resolve the required `tsx` package. No dependency files were changed to work around that environment limitation.

## Capture status

No runtime capture was created. A truthful authenticated or signed-out browser session was not available in this worktree, so no account records or UI captures were fabricated.
