import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSellerPromotionUpdate, validateSellerPromotionUpdate } from "../src/features/seller/seller-promotion-editing";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../src/features/seller/SellerPromotionEditor.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

test("seller dashboard loads scheduled promotion configuration and provides its creation form", () => {
  assert.match(dashboard, /getJSON<\{ promotions: SellerPromotion\[\] \}>\("\/seller\/promotions", controller\.signal\)/);
  assert.match(dashboard, /<SellerPromotionForm products=\{products\} onCreated=\{\(promotion\)/);
  assert.match(dashboard, /Server-priced product offers only\. Checkout decides eligibility and final prices\./);
  assert.match(sellerTypes, /export type SellerPromotion =/);
  assert.match(sellerTypes, /scope: "product";/);
  assert.match(sellerTypes, /discountPercent: number;/);
  assert.match(sellerTypes, /startsAt: string;/);
  assert.match(sellerTypes, /endsAt: string;/);
});

test("seller promotion updates contain only permitted configuration fields", () => {
  const update = buildSellerPromotionUpdate({
    name: "  Autumn launch  ", discountPercent: "15.5", startsAt: "2026-09-13T09:00", endsAt: "2026-09-14T18:30",
  });

  assert.deepEqual(update, {
    name: "Autumn launch", discountPercent: 15.5, startsAt: new Date("2026-09-13T09:00").toISOString(), endsAt: new Date("2026-09-14T18:30").toISOString(),
  });
  assert.deepEqual(Object.keys(update).sort(), ["discountPercent", "endsAt", "name", "startsAt"]);
});

test("seller promotion configuration validation rejects invalid fields and invalid schedule", () => {
  assert.match(validateSellerPromotionUpdate({ name: " ", discountPercent: "15", startsAt: "2026-09-13T09:00", endsAt: "2026-09-14T18:30" }) ?? "", /Promotion name/);
  assert.match(validateSellerPromotionUpdate({ name: "A", discountPercent: "15", startsAt: "2026-09-13T09:00", endsAt: "2026-09-14T18:30" }) ?? "", /Promotion name/);
  assert.match(validateSellerPromotionUpdate({ name: "Autumn", discountPercent: "0", startsAt: "2026-09-13T09:00", endsAt: "2026-09-14T18:30" }) ?? "", /Discount percentage/);
  assert.match(validateSellerPromotionUpdate({ name: "Autumn", discountPercent: "100.01", startsAt: "2026-09-13T09:00", endsAt: "2026-09-14T18:30" }) ?? "", /Discount percentage/);
  assert.match(validateSellerPromotionUpdate({ name: "Autumn", discountPercent: "15", startsAt: "not-a-date", endsAt: "2026-09-14T18:30" }) ?? "", /start date/);
  assert.equal(validateSellerPromotionUpdate({ name: "Autumn", discountPercent: "15", startsAt: "2026-09-14T18:30", endsAt: "2026-09-13T09:00" }), "Promotion must end after it starts.");
});

test("seller promotion rows expose an accessible editor that PATCHes configuration only", () => {
  assert.match(dashboard, /<SellerPromotionEditor promotion=\{promotion\} onSaved=\{\(updatedPromotion\)/);
  assert.match(editor, /<details className="seller-promotion-editor">/);
  assert.match(editor, /<summary>Edit promotion configuration<\/summary>/);
  assert.match(editor, /aria-label=\{`Edit configuration for \$\{promotion\.name\}`\}/);
  assert.match(editor, /patchJSON<\{ promotion: SellerPromotion \}>\(`\/seller\/promotions\/\$\{promotion\.id\}`, update\)/);
  assert.match(editor, /reason instanceof ApiError && reason\.status === 404/);
  assert.match(editor, /Promotion was not found or is no longer available\./);
  assert.match(editor, /role="status"/);
  assert.doesNotMatch(editor, /\b(?:scope|productId|sellerId|status|delete)\s*:/);
  assert.doesNotMatch(editor, /(?:post|patch)JSON.*\/(?:cart|checkout|pricing)/i);
});

test("seller promotion rows delete locally only after a successful DELETE response", () => {
  assert.match(dashboard, /const \[promotionSuccess, setPromotionSuccess\] = useState\(""\)/);
  assert.match(dashboard, /onRemoved=\{\(removedPromotionId\) => \{ setPromotions\(\(items\) => items\.filter\(\(item\) => item\.id !== removedPromotionId\)\); setPromotionSuccess\("Promotion deleted\."\); \}\}/);
  assert.match(dashboard, /promotionSuccess && <p className="seller-profile-success" role="status">\{promotionSuccess\}<\/p>/);
  assert.match(editor, /import \{ ApiError, deleteJSON, patchJSON \} from "@\/lib\/api"/);
  assert.match(editor, /const \[deleteConfirmationOpen, setDeleteConfirmationOpen\] = useState\(false\)/);
  assert.match(editor, /aria-label=\{`Delete \$\{promotion\.name\} promotion`\}/);
  assert.match(editor, /onClick=\{\(\) => setDeleteConfirmationOpen\(true\)\}/);
  assert.match(editor, /role="alertdialog" aria-modal="true" aria-labelledby="promotion-delete-confirmation-title"/);
  assert.match(editor, /Cancel deletion/);
  assert.match(editor, /Confirm deletion/);
  assert.match(editor, /disabled=\{saving \|\| deleting\}/);
  assert.match(editor, /deleting \? "Deleting promotion…" : "Delete promotion"/);
  assert.match(editor, /await deleteJSON<void>\(`\/seller\/promotions\/\$\{promotion\.id\}`\)/);
  assert.match(editor, /onRemoved\(promotion\.id\)/);
  assert.match(editor, /reason instanceof ApiError && reason\.status === 404 \? "Promotion was not found or is no longer available\."/);
  assert.match(editor, /role="alert"/);
  assert.doesNotMatch(editor, /deleteJSON.*\/(?:cart|checkout|pricing|payment|delivery)/i);
});
