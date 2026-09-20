# Wave 3 seller handoff

## Delivered

- Kept the existing authenticated seller route rail, route-selected context bar, and responsive narrow-width rail intact.
- Made the Overview materially operational: it now shows up to six real products from the loaded `/seller/products` feed that are out of stock or below six units, ordered by stock. The panel is omitted when that feed has no such records.
- Each inventory row shows only returned product fields (name, publish state, and stock). The route link goes to the existing inventory workspace.
- Notifications remain a dedicated, lazy-loaded Notifications route. No notification side column, notification count, promotion, or metric was invented for Overview.
- `RoleProtectedWorkspace` and all route authority were deliberately left untouched.

## TDD evidence

The new focused regression was written before the overview implementation: `seller overview frames real inventory records without inventing a notification side feed` in `client/tests/seller-workspace-system.test.ts`.

The normal test command could not execute its RED assertion because this checkout has no installed client dependencies (`tsx` is missing). After implementation, the dependency-free Node runner executed the static focused suite successfully:

```
node --test tests/seller-workspace-system.test.ts tests/seller-operate-visual.test.ts tests/seller-route-navigation.test.ts tests/seller-notifications-dashboard.test.ts
# 10 passed, 0 failed
```

`git diff --check` passed.

## Protected evidence block

Authenticated workspace rendering was not claimed or simulated. The only truthful signed-out path available without a session is the existing protection gate: both seller page entries wrap `SellerDashboard` in `RoleProtectedWorkspace role="seller"`; that gate resolves `/auth/me` and on a 401 replaces the route with `/login/seller`. No dashboard request or seller data is reachable before that gate is ready.

A browser capture could not be produced locally because the dependency install is absent, so `next`, `tsc`, and `eslint` are unavailable. The requested commands were attempted and failed only for those missing executables:

```
npm.cmd run typecheck  # tsc not recognized
npm.cmd run lint       # eslint not recognized
npm.cmd run build      # next not recognized
```

Install the already-locked client dependencies, then rerun those three commands and inspect `/seller` signed out (redirect to `/login/seller`) plus an authenticated seller session at desktop and narrow widths.

## Scope and commit

Changed only the seller dashboard, its route-local stylesheet, one seller-focused test, and this handoff. The unrelated untracked `.agent-wave3-seller.txt` remains untouched.
