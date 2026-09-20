# Seller feed retry repair handoff

## Outcome

Parent-gate failures #305 and #306 were caused by stale source-test callback boundaries, not by a seller dashboard behavior regression. The dashboard already preserves protected session-backed requests and independent retry behavior for the reviews and analytics feeds.

`client/tests/seller-supporting-feed-retry.test.ts` now finds the following callback declaration using a CRLF/LF-tolerant boundary, scoped after the callback under test. The assertions continue to verify each feed's pending guard, dedicated endpoint, isolated retry control, and absence of unrelated seller feed requests.

## Scope

- Changed: `client/tests/seller-supporting-feed-retry.test.ts`
- No dashboard or CSS behavior changes were needed.
- No shared, server, database, environment, deploy, taxonomy, or session-authority code was changed.

## Verification

- Passed: `node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test tests/seller-supporting-feed-retry.test.ts` (2/2)
- Passed: `npm.cmd run typecheck`
- Passed with one pre-existing unrelated warning: `npm.cmd run lint` (`AccountWorkspace.tsx` uses `<img>`)
- Blocked by required unset production configuration: `npm.cmd run build` stops at `NEXAMART_API_URL is required in production` before application compilation.
