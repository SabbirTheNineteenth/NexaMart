import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dialog = readFileSync(new URL("../src/components/ConfirmationDialog.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

test("admin state-changing actions use the reusable accessible confirmation dialog", () => {
  assert.match(dialog, /role="alertdialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /if \(event\.key === "Escape" && !pending\) onCancel\(\);/);
  assert.match(dialog, /\(requiredField \?\? confirmButtonRef\.current\)\?\.focus\(\);/);
  assert.match(dialog, /event\.key !== "Tab"/);
  assert.match(dialog, /textarea:not\(\[disabled\]\)/);
  assert.match(dialog, /previouslyFocusedElement\.current\?\.focus\(\);/);
  assert.match(styles, /\.confirmation-dialog\{[^}]*max-height:calc\(100dvh - 32px\)[^}]*overflow-y:auto/);

  assert.match(dashboard, /const \[confirmation, setConfirmation\] = useState<AdminConfirmation \| null>\(null\);/);
  assert.match(dashboard, /onClick=\{\(\) => setConfirmation\(\{ kind: "seller", change: \{ sellerId: seller\.id, action \} \}\)\}/);
  assert.match(dashboard, /setConfirmation\(\{ kind: "publication", change: \{ productId: product\.id, isPublished: !isPublished, expectedRevision: product\.expectedRevision \} \}\)/);
  assert.match(dashboard, /onClick=\{\(\) => setConfirmation\(\{ kind: "visibility", change: \{ reviewId: review\.id, isVisible: targetVisibility \} \}\)\}/);
  assert.match(dashboard, /<ConfirmationDialog[\s\S]*onConfirm=\{confirmAdminChange\}/);

  assert.match(taxonomy, /const \[archiveConfirmation, setArchiveConfirmation\] = useState<ArchiveConfirmation \| null>\(null\);/);
  assert.match(taxonomy, /if \(!isActive && node\.isActive\) setArchiveConfirmation\(\{ kind, node, form \}\);/);
  assert.match(taxonomy, /else setNodeUpdateConfirmation\(\{ kind, node, form \}\);/);
  assert.match(taxonomy, /<ConfirmationDialog[\s\S]*onConfirm=\{confirmArchive\}/);
});
