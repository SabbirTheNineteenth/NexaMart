# Wave 3 Auth handoff

## Scope

- Updated only `client/src/features/auth/RoleAuth.tsx`, `client/src/features/auth/RoleAuth.module.css`, and the focused auth regression in `client/tests/role-auth-routes.test.ts`.
- Added this handoff as requested. No server, database, shared component, environment, deployment, or API-contract changes were made.

## H01–H03 delivered

- The role-auth routes now use a bounded panel-04 composition: editorial role context on the left and the real form on the right, with a vertical editorial sign-off.
- Role routing is presented as three compact cards; email/password share a desktop row and stack at narrow widths. The mobile order intentionally places the usable form before the editorial context.
- The existing NexaMart monogram is used as a compact white/orchid treatment in place of the oversized auth lockup.
- Narrow controls are explicitly contained with zero minimum grid sizing, wrapping role-card details, and border-box, max-width inputs.

## Preserved behavior

- Login and registration still use `/auth/login` and `/auth/register`.
- Seller registration remains customer-account creation followed by the real `/seller/application` submission; success, error, and approval-gated access wording remain intact.
- Admin registration remains provisioning-only.
- Browser validation, pending disabling, alert/status feedback, and wrong-role sign-in routing remain intact. No remember-me, account recovery, or social-auth control was added.

## Verification

- RED: the new panel-04 structural regression was added before implementation and did not match the prior source.
- GREEN: `node --require ./scripts/tsx-userinfo-shim.cjs --import ./node_modules/tsx/dist/loader.mjs --test tests/role-auth-routes.test.ts` — 8/8 passed.
- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint` — passed.
- `git diff --check` — passed.
- Local signed-out visual captures were made from the development listener at `http://127.0.0.1:3100` for 1440, 700, 420, and 390px. Full four-width sets are in the temporary QA directory `C:\Users\HP!\AppData\Local\Temp\nexamart-wave3-auth-captures` for `/login`, `/register`, `/register/seller`, and `/register/admin`; corresponding seller/admin login routes were also opened and captured where the local browser completed before its headless session exited.
- Production `npm.cmd run build` is blocked before compilation by the existing production configuration guard: `NEXAMART_API_URL is required in production`. Per scope, no environment value was added or changed.

## Commit scope

Stage only `RoleAuth.tsx`, `RoleAuth.module.css`, `role-auth-routes.test.ts`, and this handoff. Do not include the pre-existing untracked `.agent-wave3-auth.txt`.
