# Final Admin Logout Handoff

## Delivered

- Added an accessible `Sign out` control to the admin sidebar.
- The control uses the established client contract: `postJSON<void>("/auth/logout", {})`. The shared API helper sends this request with `credentials: "include"`; no client-side cookie or session bypass was added.
- While the request is in flight, the control is disabled and announces `Signing out…`.
- A failed request leaves the workspace intact and presents an alert with a retry action.
- On a successful server logout, the admin is routed to the storefront via `router.replace("/")`.

## Test coverage

- Added `client/tests/admin-logout-recovery.test.ts` to lock the logout endpoint, pending state, server-success redirect, accessible alert, and retry behavior.
- TDD RED was established by adding the focused test before the dashboard implementation. The configured test command is currently blocked in this worktree because the `tsx` package is not installed (`ERR_MODULE_NOT_FOUND`); no dependency or configuration files were changed.
