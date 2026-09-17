# Visual parity mandate — frontend first

## Priority
Frontend visual/UX parity precedes new backend functionality. Do not add a backend capability until a visible, reference-matched NexaMart frontend control requires a verified contract.

## Reference rule
The supplied reference is a strict layout, hierarchy, density, responsive-behavior, and interaction checklist. Reproduce its observable UI/UX composition as closely as the current route permits:
- information order and grouping;
- navigation placement, sizing, active state, and compact density;
- panel/table/list hierarchy, spacing rhythm, borders, radii, typography scale, surface layering, and purple/plum contrast;
- desktop and narrow-mobile composition;
- loading, empty, error, disabled, confirmation, and focus behavior;
- interaction affordances only where an equivalent real NexaMart workflow exists.

Retain NexaMart’s monogram, name, truthful copy, real records, and API contracts. Never copy reference branding, proprietary wording/assets, fabricated metrics, ratings, payment claims, delivery promises, or unsupported actions.

## Completion bar per visual route
1. A focused regression is RED before visual restructuring.
2. Desktop and narrow mobile layouts match the reference composition/hierarchy.
3. Keyboard focus, dialogs, reduced motion, loading/empty/error states survive the redesign.
4. Every visible action is either bound to a current API contract or clearly omitted.
5. Parent verification includes focused tests plus full client typecheck/lint/build and rendered screenshot comparison when browser access is available.

## Sequence
Customer Explore -> Seller Operate -> Admin Monitor/Operate -> Role Auth Configure -> rendered visual QA -> backend contracts required by remaining visible controls.
