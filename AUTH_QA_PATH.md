# Local authentication QA path

## Supported path

1. Use the existing, test-only session/role fixtures for deterministic Customer, Seller, and Admin authorization evidence. They inject a resolved public account into route dependencies; no database, account provisioning, browser session, password, token, or cookie is needed. Relevant suites include `server/tests/auth-routes.test.ts`, `server/tests/auth-guard.test.ts`, `server/tests/wishlist-customer-authorization-routes.test.ts`, `server/tests/seller-analytics-routes.test.ts`, and `server/tests/taxonomy-routes-and-service.test.ts`.
2. For browser/live evidence, an owner must use an already-authorized local account through the normal sign-in UI. QA can then observe the appropriate protected workspace and its ordinary current-account response; session material must remain browser-managed and must not be copied into tools, scripts, logs, or documentation.

## Verified evidence

- `GET http://localhost:3000/api/auth/me` without credentials returned `401` on 2026-09-22. This proves the local listener's signed-out boundary only; it is not authenticated evidence.
- `server/src/modules/auth/auth.routes.ts` exposes normal registration, login, logout, and current-account routes. Its session cookie is HTTP-only; `server/src/modules/auth/auth.guard.ts` resolves authority from that server-side session and enforces roles.
- `server/tests/auth-routes.test.ts` has a mocked current-account/session test, and `server/tests/session-service.test.ts` verifies opaque-session hashing. These are safe source-level/session-contract fixtures, not live accounts.
- The test-only role fixtures include Customer/Seller/Admin public-account shapes. They are sufficient for unit authorization coverage and create no persistent data.

## Local DB guard

- `server/src/db/seeds/runLocalDemoSeed.ts` guards the local demo-catalog seed: an explicit local-seed acknowledgement, a parseable PostgreSQL URL with host exactly `localhost` or `127.0.0.1`, and a non-production environment are required before repository loading/writes.
- `server/tests/local-demo-seed-guard.test.ts` covers acceptance/rejection and asserts no guard side effects. `server/tests/local-100-demo-catalog-seed.test.ts` covers production refusal before repository writes.
- This is a seed-execution guard, not proof that the active server `DATABASE_URL` is local. `server/src/db/client.ts` requires the runtime URL but does not classify its host. Per `FINAL_LOCAL_DB_PROOF.md`, the target remains unproven because inspecting runtime secret configuration was out of scope.

## Existing fixture-account result and blockers

- No safe, ready-to-use persistent Customer/Seller/Admin fixture accounts or reusable live sessions were found.
- `demo:seed:local` is not a session-fixture solution: it is a write operation, creates/updates catalog data and a demo seller, and does not provide a Customer/Admin QA account or an approved live session. It was not run.
- `admin:create` and `seller:provision` are interactive write/provisioning commands and are excluded.
- The focused test attempt could run 12 seed/session tests successfully, but the auth-route and auth-guard suites could not start because local `hono` dependencies are absent (`server/node_modules/hono` is missing). No dependencies were installed into the repository, and no test result is claimed for those two suites.

## Handoff

To obtain live role evidence, an owner must first provide or sign into pre-existing local accounts through the standard UI, without disclosing credentials or session data. Separately, the owner must establish a non-secret proof that the active server DB target is loopback-local before authorizing any database-writing setup. Until then, use the existing mocked role/session tests as the supported QA evidence.
