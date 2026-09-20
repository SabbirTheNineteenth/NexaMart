# Wave 3 seller inventory handoff

## Delivered

- Reframed the mounted `/seller/inventory` workspace as a dense, horizontally scrollable inventory table using only the loaded `/seller/products` response.
- Reused the existing search, category, status, count, clear-filter, loading, workspace-error/retry, empty-catalog, and no-filter-match behavior. No new request, record, metric, or session behavior was added.
- Each table row presents only returned product fields: name, optional brand, optional category ID, publication state, and stock.
- Kept the existing owned stock save form and its pending, success, validation, and unavailable-product feedback. The existing detail and variant/gallery editors are available from each row.
- Added the focused S03 visual/behavior regression and updated prior seller scope assertions to describe the newly mounted existing editors.

## TDD evidence

The focused test was added before the dashboard/style implementation. Its RED execution was:

```text
not ok 1 - S03 inventory frames loaded products in a dense, filterable stock table with real editor destinations
error: expected /className=\{styles\.inventoryFilters\}/
```

After implementation, the dependency-free static focused checks passed:

```text
node --test tests/seller-inventory-table-visual.test.ts tests/seller-workspace-system.test.ts tests/seller-focused-workspaces.test.ts
# 6 passed, 0 failed
```

The stock-management test remains part of the focused suite but cannot run under bare Node because it imports a TypeScript module without the repository's `tsx` loader. The prescribed runner could not start because client dependencies are not installed:

```text
npm.cmd run test  # tsx module unavailable
npm.cmd run typecheck  # tsc not recognized
npm.cmd run lint  # eslint not recognized
NEXAMART_LOCAL_QA=1 NEXAMART_API_URL=http://localhost:3000 npm.cmd run build  # next not recognized
```

`git diff --check` passed.

## Capture status

No capture was claimed: a truthful authenticated seller session is not reachable in this checkout, and the local Next runtime is unavailable. The existing `RoleProtectedWorkspace` and session behavior were not changed.

## Scope

Changed only the seller dashboard, its route-local stylesheet, seller-focused tests, and this handoff. The unrelated untracked `.agent-wave3-seller-inventory.txt` is untouched.
