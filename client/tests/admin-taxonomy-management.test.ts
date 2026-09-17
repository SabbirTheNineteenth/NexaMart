import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(new URL("../src/features/admin/AdminDashboard.tsx", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../src/features/admin/AdminTaxonomyManagement.tsx", import.meta.url), "utf8");
const adminTypes = readFileSync(new URL("../src/types/admin.ts", import.meta.url), "utf8");

test("admin dashboard uses the canonical taxonomy governance workspace", () => {
  assert.match(dashboard, /import \{ AdminTaxonomyManagement \} from "@\/features\/admin\/AdminTaxonomyManagement";/);
  assert.match(dashboard, /<AdminTaxonomyManagement createKind=\{productCreateKind\} \/>/);
  assert.match(taxonomy, /<section className="admin-panel admin-taxonomy" aria-labelledby="taxonomy-heading">/);
  assert.match(taxonomy, /<h2 id="taxonomy-heading">Canonical taxonomy governance<\/h2>/);
  assert.match(taxonomy, /aria-label=\{`Create canonical \$\{kind\}`\}/);
  assert.match(taxonomy, /<label[^>]*>Parent category<select required name="categoryId"/);
  assert.match(taxonomy, /<label[^>]*>Review note<textarea name="reviewNote"/);
  assert.match(taxonomy, /aria-label=\{`Review proposal \$\{proposal\.name\}`\}/);
});

test("taxonomy governance uses only verified canonical taxonomy contract paths", () => {
  assert.match(taxonomy, /getJSON<AdminTaxonomyPayload>\("\/admin\/taxonomy", controller\.signal\)/);
  assert.match(taxonomy, /getJSON<AdminTaxonomyProposal\[\]>\("\/admin\/taxonomy\/proposals\?status=pending", controller\.signal\)/);
  assert.match(taxonomy, /postJSON<\{ node: AdminTaxonomyNode \}>\(`\/admin\/taxonomy\/\$\{plural\}`, payload\)/);
  assert.match(taxonomy, /patchJSON<\{ node: AdminTaxonomyNode \}>\(`\/admin\/taxonomy\/\$\{plural\}\/\$\{node\.id\}`, payload\)/);
  assert.match(taxonomy, /postJSON<\{ proposal: AdminTaxonomyProposal \}>\(`\/admin\/taxonomy\/proposals\/\$\{proposal\.id\}\/review`, \{ decision, \.\.\./);
  assert.doesNotMatch(`${dashboard}\n${taxonomy}`, /\/admin\/categories/);
  assert.doesNotMatch(taxonomy, /deleteJSON/);
  assert.match(adminTypes, /export type AdminTaxonomyNode =/);
  assert.match(adminTypes, /export type AdminTaxonomyProposal =/);
});

test("taxonomy governance accepts the proposal list response returned by the admin API", () => {
  assert.match(taxonomy, /getJSON<AdminTaxonomyProposal\[\]>\("\/admin\/taxonomy\/proposals\?status=pending", controller\.signal\)/);
  assert.match(taxonomy, /\.then\(\(loaded\) => \{ if \(!controller\.signal\.aborted\) \{ setProposals\(loaded\); setProposalState\("ready"\); \} \}\)/);
  assert.doesNotMatch(taxonomy, /getJSON<\{ proposals: AdminTaxonomyProposal\[\] \}>\("\/admin\/taxonomy\/proposals\?status=pending"/);
});

test("archiving a category reloads canonical taxonomy so cascaded subcategories cannot remain stale", () => {
  assert.match(taxonomy, /if \(kind === "category" && !updated\.isActive\) \{ await loadTaxonomy\(\); \}/);
  assert.match(taxonomy, /setTaxonomy\(\(current\) => \(\{ \.\.\.current, \[plural\]: sortNodes\(current\[plural\]\.map\(\(item\) => item\.id === updated\.id \? updated : item\)\) \}\)\);/);
  assert.match(taxonomy, /setFeedback\(\(current\) => \(\{ \.\.\.current, \[node\.id\]: \{ kind: "success", message: `\$\{updated\.name\} saved\.` \} \}\)\);/);
});

test("a mutation that began before an archive-triggered taxonomy reload cannot overwrite its authoritative result", () => {
  assert.match(taxonomy, /const taxonomyRevision = useRef\(0\);/);
  assert.match(taxonomy, /const requestRevision = \+\+taxonomyRevision\.current;/);
  assert.match(taxonomy, /const mutationRevision = taxonomyRevision\.current;/);
  assert.match(taxonomy, /if \(mutationRevision === taxonomyRevision\.current\) \{ setTaxonomy\(\(current\) => \(\{ \.\.\.current, \[plural\]: sortNodes\(current\[plural\]\.map\(\(item\) => item\.id === updated\.id \? updated : item\)\) \}\)\); \}/);
  assert.match(taxonomy, /if \(requestRevision === taxonomyRevision\.current && !controller\.signal\.aborted\)/);
});

test("a create response begun before a taxonomy reload cannot append stale taxonomy state", () => {
  assert.match(taxonomy, /const mutationRevision = taxonomyRevision\.current;\n    const payload = \{ name: String\(data\.get\("name"\)/);
  assert.match(taxonomy, /if \(mutationRevision === taxonomyRevision\.current\) \{ setTaxonomy\(\(current\) => \(\{ \.\.\.current, \[plural\]: sortNodes\(\[\.\.\.current\[plural\], node\]\) \}\)\); \}/);
  assert.match(taxonomy, /form\.reset\(\);\n      setFeedback/);
});

test("taxonomy loading and mutations are abort-safe, retryable, status-aware, and row-scoped", () => {
  assert.match(taxonomy, /const taxonomyRequestController = useRef<AbortController \| null>\(null\);/);
  assert.match(taxonomy, /const proposalRequestController = useRef<AbortController \| null>\(null\);/);
  assert.match(taxonomy, /taxonomyRequestController\.current\?\.abort\(\);/);
  assert.match(taxonomy, /proposalRequestController\.current\?\.abort\(\);/);
  assert.match(taxonomy, /aria-label="Retry taxonomy records"/);
  assert.match(taxonomy, /aria-label="Retry pending taxonomy proposals"/);
  assert.match(taxonomy, /const \[pendingIds, setPendingIds\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.match(taxonomy, /const isPending = pendingIds\.has\(node\.id\);/);
  assert.match(taxonomy, /const isPending = pendingIds\.has\(proposal\.id\);/);
  assert.match(taxonomy, /name="isActive"/);
  assert.match(taxonomy, /node\.isActive \? "Active" : "Archived"/);
  assert.match(taxonomy, /role=\{itemFeedback\.kind === "error" \? "alert" : "status"\}/);
  assert.match(taxonomy, /role="alert"/);
});

test("canonical taxonomy saves and proposal decisions require accessible confirmation before mutating", () => {
  assert.match(taxonomy, /const \[nodeUpdateConfirmation, setNodeUpdateConfirmation\] = useState<NodeUpdateConfirmation \| null>\(null\);/);
  assert.match(taxonomy, /const \[proposalReviewConfirmation, setProposalReviewConfirmation\] = useState<ProposalReviewConfirmation \| null>\(null\);/);
  assert.match(taxonomy, /setNodeUpdateConfirmation\(\{ kind, node, form \}\);/);
  assert.match(taxonomy, /function confirmNodeUpdate\(\) \{[\s\S]*await updateNode\(confirmed\.kind, confirmed\.node, confirmed\.form\);/);
  assert.match(taxonomy, /setProposalReviewConfirmation\(\{ proposal, decision, form: event\.currentTarget \}\);/);
  assert.match(taxonomy, /function confirmProposalReview\(\) \{[\s\S]*await reviewProposal\(confirmed\.proposal, confirmed\.decision, confirmed\.form\);/);
  assert.match(taxonomy, /<ConfirmationDialog title=\{`Save changes to \$\{nodeUpdateConfirmation\.node\.name\}\?`\}[\s\S]*onCancel=\{\(\) => setNodeUpdateConfirmation\(null\)\}[\s\S]*onConfirm=\{confirmNodeUpdate\}/);
  assert.match(taxonomy, /<ConfirmationDialog title=\{`\$\{proposalReviewConfirmation\.decision === "approve" \? "Approve" : "Reject"\} \$\{proposalReviewConfirmation\.proposal\.name\}\?`\}[\s\S]*onCancel=\{\(\) => setProposalReviewConfirmation\(null\)\}[\s\S]*onConfirm=\{confirmProposalReview\}/);
  assert.match(taxonomy, /<ConfirmationDialog title=\{`Archive \$\{archiveConfirmation\.node\.name\}\?`\}[\s\S]*onConfirm=\{confirmArchive\}/);
});
