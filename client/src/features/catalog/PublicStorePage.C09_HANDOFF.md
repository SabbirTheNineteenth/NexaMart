# C09 public-store handoff

Route `/stores/[slug]` keeps its existing `GET /catalog/stores/${slug}` contract, returned store/product fields, product links, loading, empty, alert, and retry paths. No unsupported commerce claims or data were added.

Focused source checks passed 10/10 on integration: `visual-10-public-store.test.ts` and `storefront-store-discovery.test.ts`. The existing worktree evidence records passing typecheck, lint, local-QA build, and real populated Demo Store captures at 1440, 700, 420, and 390. Loading, empty, and failure are covered by source tests rather than fabricated browser responses.
