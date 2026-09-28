# Zoom layout audit

The Client was rebuilt with `NEXAMART_LOCAL_QA=1` and the local API target on port 3000, then served as a fresh production build on port 3001. Chrome 153 ran in an isolated profile. The [audit script](../scripts/zoom-layout-audit.mjs) uses Chrome DevTools Protocol to set the effective CSS viewport (`physical width / zoom`); this tests zoom reflow geometry but does not change Chrome's toolbar zoom setting. It records page scroll width, overflowing elements, header collision, clipped status panels, hydration/error-boundary state, and runtime exceptions.

## Reproduced defects and owning rules

| Route | Physical viewport / effective zoom | Before | Owning rule | After |
| --- | --- | --- | --- | --- |
| `/`, `/login`, `/register/seller` | 390×900 / 150% (260 CSS px) | 320px document width against a 260px viewport | Both legacy and later theme declarations of `body{min-width:320px}` in `globals.css` | 245px document width, no page overflow |
| `/` | 390×900 / 150% | Brand wordmark crowded the header actions after the body-width fix | Storefront mobile header retained its wordmark below 320 CSS px | Brand mark remains; actions have their own space |
| `/login`, `/register/seller` | 390×900 / 150% | Equal-width role tabs broke their labels into unreadable fragments | Auth tabs remained three columns at 260 CSS px | Single-column, 44px-high tabs |
| `/` | 390×900 / 150% | Truthful empty-media message clipped beyond the hero column | `.heroMediaFrame` combined a 16:10 aspect ratio with `min-height:12rem`, forcing a 287px width inside a 190px grid track | Aspect ratio released only below 360 CSS px; message fully visible |

The initial body-width repair was still red because the later `nexamart-theme` layer retained the 320px minimum. Once both declarations were corrected, the browser exposed the distinct header, tabs, and hero-media defects above. These were fixed at the owning component rules, without global clipping or layout transforms.

## Final rendered checks

The [final matrix](zoom-final-evidence/results.json) passed all 108 public/auth cases: `/`, `/deals`, `/stores`, `/login`, `/login/seller`, `/login/admin`, `/register`, `/register/seller`, and `/register/admin` at 1440×900 and 80/90/100/110/125/150%, 1280×800 and 90/100/125%, plus 700/420/390px at 100%. Additional 390×900/150% visual checks passed for the Storefront and both representative auth forms. The [protected-route results](zoom-protected-evidence/results.json) show no page-level overflow or runtime boundary at 1440/700/420/390px, but `/account`, `/seller`, and `/admin` displayed their genuine service/access states. Their authenticated workspaces cannot be claimed as verified without a reachable API and legitimate role sessions. A real product-detail slug was likewise unavailable; no catalog data was fabricated.

The local Chrome harness does not mutate cookies, bypass RBAC, or write to the database. Native page scrollbars and intentionally contained horizontal rails are not classified as page overflow.
