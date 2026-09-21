# Wave 2 integration progress

Base verified: `742ca624eea7192517c488ca8b90d989caf468a7` (`fix(client): reconcile seller editor UX integration`).

## Source commits applied cleanly, in order

| Source | Integrated commit | Subject |
| --- | --- | --- |
| `8ede17adb3401353fed5b32c70f58ecdaa99da83` | `03cfa0838d27fc5225c925a0f939f8248856303c` | fix(client): repair storefront rendered layout overflow |
| `ac49ba8266f75df3dec9e15ae606a7c40201737e` | `c1e1361dba112d4c7e99123add69b7081b074804` | feat(client): complete auth and shared UX remediation |
| `3e001d6b9c8ac1f800b0c0244ff819b5ecf75aae` | `111775e586a1695efb3ae47c443a478119bdf791` | fix(client): polish rendered product detail layout |
| `71dd64fe91dcc7c9fd54c26555878d72953faa4f` | `ffdd15e7ac79dbce93e2b50d1d5a7a59a07573bd` | fix(client): polish rendered account workspace |
| `aa61f1b999ff6d7c52f15eda4f25aba451ca9add` | `de4a1a84119453bb14e98527bb710561ec5bd15f` | fix(client): polish rendered admin control room |
| `873b900c043a49f38500eb57747638eb42249456` | `36c5629ccd1e38f1660d73ff64f6287da123df5a` | fix(client): polish rendered seller workspace |

All six source commits passed `git show --check` before integration. No cherry-pick conflicts occurred.

## Client full gate

- PASS: `npm.cmd test`
- PASS: `npm.cmd run typecheck`
- PASS: `npm.cmd run lint`
- PASS: `NEXAMART_LOCAL_QA=1 NEXAMART_API_URL=http://localhost:3000 npm.cmd run build`
- PASS: `git diff --check`

`.task.txt` was intentionally excluded from this integration commit.
