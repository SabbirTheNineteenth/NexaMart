# Wave 1 seller editor reconciliation

- Parent commit: `1f99ba3c0b013cfd780a98f6e0f91b72d550be15`
- Original commit: `ed921d7` (`Repair seller editor form structure`)

## Resolved paths

- `client/src/features/seller/SellerProductEditor.tsx`
- `client/src/features/seller/SellerProductForm.tsx`
- `client/src/features/seller/SellerPromotionEditor.tsx`
- `client/src/features/seller/SellerPromotionForm.tsx`
- `client/src/features/seller/SellerTaxonomyManagement.tsx`
- `client/src/features/seller/SellerEditorForms.module.css`
- `client/tests/seller-editor-form-ux.test.ts`
- `client/tests/seller-product-editing.test.ts`
- `client/tests/seller-promotion-dashboard.test.ts`
- `client/tests/create-success-feedback-ui.test.ts`

## Resolution

Kept the already-integrated seller dashboard request, validation, error, feedback,
delete-confirmation, and focus behavior. Added scoped editor surfaces, semantic
fieldsets and guidance, busy/disabled form states, visible focus treatment,
responsive actions, and reduced-motion support. The deleted broad editor UX test
was replaced with focused checks for field grouping, pending-state disabling, and
scoped visual accessibility treatment.

## Commands and results

```text
node --require ./scripts/tsx-userinfo-shim.cjs --import tsx --test \
  tests/seller-editor-form-ux.test.ts \
  tests/seller-product-editing.test.ts \
  tests/seller-promotion-dashboard.test.ts \
  tests/create-success-feedback-ui.test.ts \
  tests/seller-taxonomy-management.test.ts
# pass 21
# fail 0

npm.cmd test
# tests 411
# pass 409
# fail 2

npm.cmd run typecheck
# pass

npm.cmd run lint
# pass
```

The two full-suite failures are outside this reconciliation's allowed files and
were not changed here:

- `client/tests/admin-taxonomy-management.test.ts` — stale taxonomy create-response test
- `client/tests/customer-stale-state-regressions.test.ts` — unresolved product-slug navigation test
