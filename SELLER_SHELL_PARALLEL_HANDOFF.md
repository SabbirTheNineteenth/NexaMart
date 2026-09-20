# Seller shell parallel handoff

## Delivered

- Improved the route-local seller primary-load error state in `SellerDashboard.tsx`.
- The existing role gate remains the sole authority for signed-out and wrong-role handling.
- When an authorized seller workspace request fails, the dashboard now keeps its route shell, names the unavailable selected section, explains that no seller data was loaded, retains the real error detail, and offers the existing retry request. It renders no substitute workspace data.

## TDD and verification

- RED: added `client/tests/seller-shell-recovery.test.ts` before the dashboard markup. The normal test command could not start because this worktree initially lacked `tsx`.
- GREEN: `node --experimental-strip-types --test tests/seller-shell-recovery.test.ts` passed (1/1).
- `git diff --check` passed.
- `npm run typecheck`, `npm run lint`, and `npm run build` were attempted but are blocked because the local dependency installation is incomplete: `tsc`, `eslint`, and `next` are not available from `client/node_modules`.

## Local QA captures

No screenshots were captured. The only currently reachable localhost seller state is the API-authoritative signed-out gate, while this improvement is an authorized seller primary-load error state; no legitimate seller session is available to truthfully reach it. The unavailable build tooling also prevents a safe local capture workflow.

## Scope

Changed only `client/src/features/seller/SellerDashboard.tsx`, the focused `seller-shell-recovery` test, and this handoff. No API, auth/session, server, database, global/shared, or taxonomy changes were made.
