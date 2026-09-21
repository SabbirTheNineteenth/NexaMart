# Final cleanup candidates audit

Date: 2026-09-21
Scope: tracked and present untracked code/artifact files only. This is a read-only
classification; no candidate was deleted or altered.

## Method and project boundary

NexaMart is a two-package repository: `client/` is a Next.js application and
`server/` is a Hono/Drizzle API. The two committed package manifests provide the
only application scripts. Their client/server test, lint, typecheck, build,
development, migration, and operational commands all resolve to source files
listed below; no root package script exists.

I reviewed `git status --short --branch`, tracked paths, `.gitignore`, both
package scripts, source imports/references (excluding dependency trees), and the
repository's README/progress/runbook context. “No reference” means no textual
reference was found in tracked non-dependency source, scripts, tests, or docs; it
does not prove external consumers do not exist.

## Classification

| Classification | Candidate | Evidence | Follow-up condition |
| --- | --- | --- | --- |
| **Remove later** | `server/npm` | A 479-byte tracked file first added in baseline commit `a05fda3`. It is not named by either package script or any repository reference. Reading its blob yields a captured PowerShell `Start-Process` failure for an obsolete absolute `C:\Users\corey\OneDrive\...` path, rather than executable/source content. | Remove in a separate, reviewed cleanup commit; verify no local workflow still invokes `server/npm`. |
| **Remove later** | `client/runtime-account.html` | A 5,961-byte tracked static capture first added in `a05fda3`. It contains Next development `/_next/static/chunks/...` paths and serialized Flight payload for `/account`, is not an app route/public asset, and has no repository reference. | Remove after confirming it is not intentionally retained as a debugging fixture. It should not be used as a deployable artifact. |
| **Remove later** | `client/public/auth/admin-story.png`, `customer-story.png`, `seller-story.png` | These three large tracked images have no references. `RoleAuth.tsx` and `role-auth-routes.test.ts` use/check only `admin-panel.png`, `customer-panel.png`, and `seller-panel.png`. | Remove together only after a visual/content owner confirms the story variants are not planned campaign assets. |
| **Remove later** | `client/public/auth/nexamart-cart-logo-transparent.png`, `client/public/auth/reference-logo.png` | Both have the identical tracked blob ID (`4fd86c…`), are unreferenced, and are not the logo used by `BrandLogo.tsx` or CSS. | Retain at most one only if a content owner identifies a non-repository use; otherwise remove both as duplicate obsolete assets. |
| **Remove later** | `client/public/brand/nexamart-logo.png` | No reference found. Current application branding uses `client/public/brand/nexamart-monogram-v1.png` in `BrandLogo.tsx` and `globals.css`; the standalone direction board also uses the monogram. | Remove only after a visual check of routes and confirmation that no external documentation expects the full logo file. |
| **Keep** | `client/public/auth/admin-panel.png`, `customer-panel.png`, `seller-panel.png` | `RoleAuth.tsx` maps every customer/seller/admin role flow to these exact URLs, and `role-auth-routes.test.ts` asserts their local presence. | Runtime assets; do not remove. |
| **Keep** | `client/public/brand/nexamart-monogram-v1.png` | Imported by `BrandLogo.tsx`, referenced from global CSS, and used by `NexaMart-direction-board.html`. | Runtime brand asset; do not remove. |
| **Keep** | `NexaMart-direction-board.html` | Not a runtime page, but `CODEX_PROGRESS.md` explicitly records it as the retained standalone internal visual-direction board and its purpose. It has no generated-build markers and is a self-contained design decision artifact. | Keep unless the project owner formally retires this visual-direction reference and updates the progress record. |
| **Keep** | `scripts/autonomous-codex-runner.mjs`, `scripts/launch-runner-after-codex.mjs`, `.vscode/tasks.json` | VS Code task invokes the runner; launcher explicitly spawns the runner. The runner reads the durable progress/parity records and manages its own ignored state under `artifacts/`. | Operational tooling chain; do not remove piecemeal. |
| **Unsafe-to-remove** | `server/src/db/migrations/**` and `server/src/db/migrations/meta/**` | `server/package.json` exposes Drizzle generation/migration commands, and README requires journal-order inspection. README also identifies an intentionally unapplied migration tail. | Schema history is append-only release evidence. Never use a cleanup pass to remove or reorder it. |
| **Unsafe-to-remove** | `.env.example`, `client/config/api-target.mjs`, `server/src/config/environment.ts`, `server/drizzle.config.ts`, Next/Vercel/TypeScript/ESLint configuration | README defines these as production and security boundaries; package scripts and runtime imports depend on them. | No configuration cleanup without a separate security/runtime review. |
| **Unsafe-to-remove** | Root delivery/audit/runbook records, including `CODEX_AUDIT_FINDINGS.md`, `CODEX_MASTER_PROMPT.txt`, `CODEX_PROGRESS.md`, `DELIVERY_LEDGER.md`, `DESIGN_CONTRACT.md`, `PRODUCT_CONTEXT.md`, `REFERENCE_TO_LOCALHOST_PARITY_MATRIX.md`, `QA_01_*.md`, `VISUAL_7_AUDIT.md`, `*_HANDOFF.md`, and `WAVE3_*.md` | These are not imported application code, but repository instructions and progress records explicitly use them as durable operating memory. `CODEX_MASTER_PROMPT.txt` directly names several of them; handoffs preserve validation/scope evidence. | Archive/retention policy must be decided by the owner; do not delete them merely because they have no TypeScript import. |
| **Unsafe-to-remove** | `client/tests/**`, `server/tests/**`, test shims, and package lockfiles | Both `test` scripts execute their respective test trees; the client script requires `scripts/tsx-userinfo-shim.cjs`. README prescribes `npm ci` from both committed lockfiles. | Test and reproducibility inputs; do not treat breadth or age as cleanup evidence. |
| **Unsafe-to-remove** | Untracked `.task.txt` | At audit start, `git status` reported it as the sole untracked file. It contains the task instructions for this audit and is user/workflow-owned, not an application artifact. | Leave unstaged and untouched. Do not include it in a cleanup or this report commit. |
| **Remove later** | Untracked `stdout` | A 1,497-byte local diagnostic output file was created during this audit while examining the anomalous `server/npm` blob. It is not tracked or referenced. It is intentionally left untouched because this task prohibits deletion. | Remove manually in a later approved cleanup; do not stage it. |

## Generated/ignored artifacts

`.gitignore` intentionally excludes `client/node_modules/`, `client/.next/`,
`client/tsconfig.tsbuildinfo`, `server/node_modules/`, `server/dist/`, local
`.env*`, and `.vercel/`. They are normal dependency/build/local-state outputs;
none were present as tracked files in this audit. The autonomous runner may also
create ignored `artifacts/autonomous-codex/` state and `.nexamart-autonomous.*`
control files. Do not add such outputs to Git, and do not delete them as part of
this report task.

## Outcome

The recommended future cleanup set is limited to `server/npm`, the stale Next
runtime capture, three unreferenced story images, two duplicate/unreferenced auth
logos, and the unreferenced full brand logo. Each should be removed only in a
dedicated follow-up commit with a final reference scan and visual-owner approval
for the image assets. No source-module, package-script, migration, configuration,
test, lockfile, or user-owned untracked file is approved for removal by this
audit.
