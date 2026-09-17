import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/seller/SellerDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/seller/SellerTaxonomyManagement.tsx", import.meta.url), "utf8");
const productForm = readFileSync(new URL("../src/features/seller/SellerProductForm.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../src/features/seller/SellerProductEditor.tsx", import.meta.url), "utf8");
const sellerTypes = readFileSync(new URL("../src/types/seller.ts", import.meta.url), "utf8");

test("seller taxonomy workspace uses only the verified approved-options and proposal contracts", () => {
  assert.match(dashboard, /<SellerTaxonomyManagement products={products} onClassified=/);
  assert.match(taxonomy, /getJSON<SellerTaxonomyOptions>\("\/seller\/taxonomy\/options", controller\.signal\)/);
  assert.match(taxonomy, /getJSON<\{ proposals: SellerTaxonomyProposal\[\] \}>\("\/seller\/taxonomy\/proposals", controller\.signal\)/);
  assert.match(taxonomy, /patchJSON<\{ product: SellerProduct \}>\(`\/seller\/taxonomy\/products\/\$\{product\.id\}\/classification`, payload\)/);
  assert.match(taxonomy, /postJSON<\{ proposal: SellerTaxonomyProposal \}>\("\/seller\/taxonomy\/proposals", payload\)/);
  assert.match(taxonomy, /deleteJSON<void>\(`\/seller\/taxonomy\/proposals\/\$\{proposal\.id\}`\)/);
  assert.doesNotMatch(`${taxonomy}\n${editor}\n${productForm}`, /\/seller\/categories|\/seller\/brands/);
});

test("seller taxonomy classification uses dependent approved controls and truthfully makes products drafts", () => {
  assert.match(taxonomy, /<label>Category<select required name="categoryId"/);
  assert.match(taxonomy, /taxonomy\.subcategories\.filter\(\(subcategory\) => subcategory\.categoryId === selectedCategoryId\)/);
  assert.match(taxonomy, /name="subcategoryId"[\s\S]*disabled=\{!selectedCategoryId \|\| savingClassification\}/);
  assert.match(taxonomy, /name="brandId"/);
  assert.match(taxonomy, /categoryId, \.\.\.\(subcategoryId \? \{ subcategoryId \} : \{\}\), \.\.\.\(brandId \? \{ brandId \} : \{\}\)/);
  assert.match(taxonomy, /onClassified\(\{ \.\.\.response\.product, isPublished: false \}\)/);
  assert.match(taxonomy, /Classification saved\. This product is now a draft and requires moderation before publication\./);
});

test("seller taxonomy proposals are scoped, withdrawable, status-aware, and accessible", () => {
  assert.match(taxonomy, /aria-label="Retry approved taxonomy options"/);
  assert.match(taxonomy, /aria-label="Retry your taxonomy proposals"/);
  assert.match(taxonomy, /const taxonomyRequestController = useRef<AbortController \| null>\(null\);/);
  assert.match(taxonomy, /const proposalRequestController = useRef<AbortController \| null>\(null\);/);
  assert.match(taxonomy, /taxonomyRequestController\.current\?\.abort\(\);/);
  assert.match(taxonomy, /proposalRequestController\.current\?\.abort\(\);/);
  assert.match(taxonomy, /kind === "subcategory" && <label>Parent category<select required name="categoryId"/);
  assert.match(taxonomy, /proposal\.status === "pending"/);
  assert.match(taxonomy, /Withdraw proposal/);
  assert.match(taxonomy, /role=\{itemFeedback\.kind === "error" \? "alert" : "status"\}/);
});

test("seller proposal withdrawal requires an accessible confirmation before its protected DELETE", () => {
  assert.match(taxonomy, /const \[withdrawalConfirmation, setWithdrawalConfirmation\] = useState<SellerTaxonomyProposal \| null>\(null\)/);
  assert.match(taxonomy, /onClick=\{\(\) => setWithdrawalConfirmation\(proposal\)\}/);
  assert.match(taxonomy, /role="alertdialog" aria-modal="true" aria-labelledby="taxonomy-withdrawal-confirmation-title"/);
  assert.match(taxonomy, /Cancel withdrawal/);
  assert.match(taxonomy, /Confirm withdrawal/);
  assert.match(taxonomy, /await deleteJSON<void>\(`\/seller\/taxonomy\/proposals\/\$\{proposal\.id\}`\)/);
  assert.match(taxonomy, /setWithdrawalConfirmation\(null\);/);
});

test("product creation does not invent taxonomy fields and directs sellers to classify drafts", () => {
  assert.doesNotMatch(productForm, /categoryId|subcategoryId|brandId/);
  assert.match(productForm, /Classify it in the approved taxonomy section before it can be moderated\./);
  assert.doesNotMatch(editor, /name="categoryId"|clearCategory/);
});

test("seller taxonomy types model approved nodes and proposal history without direct category editing", () => {
  assert.match(sellerTypes, /export type SellerTaxonomyOptions =/);
  assert.match(sellerTypes, /subcategoryId\?: string \| null;/);
  assert.match(sellerTypes, /brandId\?: string \| null;/);
  assert.match(sellerTypes, /export type SellerTaxonomyProposal =/);
  assert.match(sellerTypes, /status: "pending" \| "approved" \| "rejected" \| "withdrawn";/);
});
