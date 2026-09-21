# Final seller logout handoff

## Delivered

- Added a keyboard-accessible `Sign out` action to the seller workspace command bar.
- The action uses the existing client logout contract: `postJSON<void>("/auth/logout", {})`.
- The shared API client sends that request with `credentials: "include"`; this change does not read, write, or clear browser cookies, local storage, or session storage.
- While pending, the action is disabled and announces `Signing out…` through its visible label.
- On success, the browser navigates to `/`, allowing the normal server/session flow to determine the next state.
- On failure, the seller remains in the workspace and receives a `role="alert"` recovery panel with the service error and a retry action.

## Verification

- Focused contract test: `node --test tests/seller-logout-recovery.test.ts` — passes (2 tests).
- `git diff --check` — passes.
- The normal `npm.cmd test` command could not run in this worktree because the declared `tsx` package is not installed (`ERR_MODULE_NOT_FOUND`). No dependency or package-manifest changes were made.

## Scope

Only seller dashboard/logout-focused client files and this handoff were changed. No server, session-contract, cookie, shared workspace, deployment, or environment files were altered.
