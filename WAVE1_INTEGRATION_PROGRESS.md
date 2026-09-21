# Wave 1 integration progress

Integrated commits (in order):

- `ac2d4cc` (`refine admin control room queues`) cherry-picked as `7e31365`.
- `a264862` (`Improve admin taxonomy management workflow`) cherry-picked as `576e0b4`.

`ed921d7` was intentionally not attempted; it remains owned by the dedicated seller reconciliation agent.

Command results:

- `cd client && npm.cmd test` — failed before tests could execute: Node could not resolve the `tsx` package. TAP reported 134 failed test files, all with `ERR_MODULE_NOT_FOUND` for `tsx`.
- `cd client && npm.cmd run typecheck` — failed: `tsc` is not recognized as a command.
- `cd client && npm.cmd run lint` — failed: `eslint` is not recognized as a command.
- Production build — intentionally not run because seller reconciliation has not landed.
- `git diff --check` — passed (exit 0).
