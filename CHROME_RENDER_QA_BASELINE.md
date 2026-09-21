# Chrome Rendered QA — 2026-09-21

Observed on the isolated local demo storefront at `http://localhost:3005/?brand=waypoint` in Chrome (desktop viewport):

- Catalog/product rows visibly overflow horizontally; page shows an inner horizontal scrollbar. This fails the required neat responsive storefront baseline.
- Brand-chip rail also overflows rather than providing a compact, intentional responsive layout.
- There is a large empty dark region between the brand rail and catalog-information heading at the inspected scroll position, indicating broken vertical rhythm/section sizing.
- Current browser is the `local-demo-storefront` worktree (not the Wave 1 integration branch). Observations are a baseline defect record only; no integrated branch is visually accepted from this capture.
- No native permission prompt was present; Chrome was already controlled by automated test software.

Required follow-up after Wave 1 integration: reproduce at 1440, 700, 420, 390, trace the overflow to owning CSS, add a behavioral/render-contract regression, repair, then recapture.
