# Storefront rendered-layout repair

## Scope

- `client/src/features/catalog/Storefront.module.css`
- `client/tests/storefront-render-repair.test.ts`

The stylesheet now contains Storefront-local containment for horizontally scrolling rails and compact spacing after the brand rail. Existing API-backed interactions, 44px controls, focus styling, and reduced-motion handling were preserved.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd test -- storefront-render-repair.test.ts` | Initially could not execute because `tsx` was not installed in this worktree. |
| `npm.cmd ci` | Installed the lockfile dependencies. |
| `node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test tests/storefront-render-repair.test.ts` | Passed: 1/1. |
| `npm.cmd test` | Passed: 414/414. |
| `npm.cmd run typecheck` | Passed. |
| `npm.cmd run lint` | Passed with 0 errors and 4 existing warnings in `AccountWorkspace.tsx` and `SellerDashboard.tsx`, outside this slice. |

No production build was run.
