# Final repair — Admin feed retry assertions

## Scope

- Owned files: `client/tests/admin-review-feed-retry.test.ts`, `client/tests/admin-supporting-feed-retry.test.ts`, `client/tests/admin-summary-feed-state.test.ts`, and this handoff.
- No production code changed. The AdminDashboard feed loaders retain their independent pending guards, error resets, request endpoints, feed-local state updates, retry controls, and abort cleanup.

## Repair

- Replaced stale layout-dependent extraction boundaries in review and supporting-feed retry tests with each loader's own `useCallback` terminator. This preserves the exact-source behavioral assertions while allowing the A02–A04 overview-source reordering and CRLF source layout.
- TDD RED evidence: `node --experimental-strip-types --test` for the three scoped tests reported exactly five boundary failures (review plus products, sellers, finance, and analytics); the summary state assertions already passed.

## Validation

- Focused tests: PASS — `node --experimental-strip-types --test tests/admin-review-feed-retry.test.ts tests/admin-supporting-feed-retry.test.ts tests/admin-summary-feed-state.test.ts` (7/7).
- `git diff --check`: PASS.
- Full client test, typecheck, lint, and local-QA build could not run because `client/node_modules` and `client/package-lock.json` are absent. The standard test command fails with `ERR_MODULE_NOT_FOUND: tsx`; the other scripts cannot find `tsc`, `eslint`, or `next`. No dependency installation was performed.
