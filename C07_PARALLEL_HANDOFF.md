# C07 parallel handoff

## Completed defect

The `/deals` no-data hero no longer displays the decorative `NEXA` placeholder, which could imply a featured active deal when the authoritative feed is loading, empty, or unavailable. Its route-local style now renders a neutral surface only. The API request, API eligibility, returned pricing, refresh scheduling, populated cards, empty/error copy, and retry callback are unchanged.

## TDD and verification

- RED attempt: `node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test tests/c07-deals-empty-hero.test.ts` could not load the absent `tsx` dependency before test execution.
- GREEN: `node --experimental-strip-types --test tests/c07-deals-empty-hero.test.ts` passed (1/1).
- `git diff --check` passed.
- `npm.cmd run typecheck` and `npm.cmd run lint` were attempted but their local executables were unavailable after the dependency install did not complete (`tsc` / `eslint` not recognized).
- Local-QA build was attempted; the initial POSIX environment syntax is invalid in PowerShell, and the corrected attempt could not proceed while `npm ci` remained incomplete. No build success is claimed.

## Capture status

No new 1440/700/420/390 captures were created. The existing local service evidence remains the truthful empty response (`200 {"products":[]}`); a populated deal must not be fabricated.
