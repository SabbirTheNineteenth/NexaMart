# Wave 3 protected-workspace gate handoff

## Outcome

`RoleProtectedWorkspace` now keeps protected content unavailable while it verifies the current session, uses a generic live loading state, and distinguishes a confirmed signed-out session from an unresolved session lookup.

- A confirmed `/auth/me` 401 redirects to the requested role sign-in route.
- Network, service, malformed-response, and non-401 resolution failures show a truthful retryable recovery state; they are no longer described as an expired session.
- A successful recheck restores the workspace, including after an intercepted protected API 401/403.
- Wrong-role recovery is an announced alert, provides an explicit role-sign-in action, and moves focus to its `h1` so keyboard and screen-reader users receive the state change.

## Scope

- Changed: `client/src/components/RoleProtectedWorkspace.tsx`
- Changed: `client/tests/auth-protected-workspace-gate.test.ts`
- No session API, cookie, route, auth, dashboard, global-style, server, database, environment, deployment, or external-service changes.

## TDD and verification

- Added the focused AUTH-02 through AUTH-05 contracts before implementing the gate changes.
- Passed: `node --experimental-strip-types --test tests/auth-protected-workspace-gate.test.ts` (7/7). This direct Node fallback was necessary because the repo-local `tsx` package is absent.
- Blocked by missing client dependencies: `npm.cmd run typecheck` (`tsc` unavailable), `npm.cmd run lint` (`eslint` unavailable), and `npm.cmd run build` (`next` unavailable).
- Passed: `git diff --check`.
- Local QA capture not attempted: no listener was reachable on the checked local app/API ports, so there was no safe reachable no-session state to capture.

## Follow-up

After dependencies are restored, rerun the normal focused test command plus typecheck, lint, and build. With local services available, verify the `/seller` or `/admin` no-session redirect and capture only that reachable state.
