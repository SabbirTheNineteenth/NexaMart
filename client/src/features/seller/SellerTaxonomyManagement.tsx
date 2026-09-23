"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, deleteJSON, getJSON, patchJSON, postJSON } from "@/lib/api";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import styles from "./SellerEditorForms.module.css";
import type { SellerProduct, SellerTaxonomyKind, SellerTaxonomyOptions, SellerTaxonomyProposal } from "@/types/seller";

type LoadState = "loading" | "ready" | "error";
type Feedback = { kind: "success" | "error"; message: string };

const errorMessage = (reason: unknown, fallback: string) => {
  if (reason instanceof ApiError && reason.status === 404) return "This record is no longer available.";
  if (reason instanceof ApiError && reason.status === 409) return "This conflicts with the current taxonomy. Refresh and try again.";
  return reason instanceof Error ? reason.message : fallback;
};
const titleFor = (kind: SellerTaxonomyKind) => `${kind[0].toUpperCase()}${kind.slice(1)}`;

export function SellerTaxonomyManagement({ products, onClassified }: { products: SellerProduct[]; onClassified(product: SellerProduct): void }) {
  const [taxonomy, setTaxonomy] = useState<SellerTaxonomyOptions>({ categories: [], subcategories: [], brands: [] });
  const [proposals, setProposals] = useState<SellerTaxonomyProposal[]>([]);
  const [taxonomyState, setTaxonomyState] = useState<LoadState>("loading");
  const [proposalState, setProposalState] = useState<LoadState>("loading");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [proposalError, setProposalError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [savingClassification, setSavingClassification] = useState(false);
  const [classificationFeedback, setClassificationFeedback] = useState<Feedback | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [withdrawalConfirmation, setWithdrawalConfirmation] = useState<SellerTaxonomyProposal | null>(null);
  const taxonomyRequestController = useRef<AbortController | null>(null);
  const proposalRequestController = useRef<AbortController | null>(null);
  const pendingMutationIds = useRef(new Set<string>());
  const loadTaxonomy = useCallback(() => {
    taxonomyRequestController.current?.abort();
    const controller = new AbortController();
    taxonomyRequestController.current = controller;
    setTaxonomyState("loading"); setTaxonomyError("");
    getJSON<SellerTaxonomyOptions>("/seller/taxonomy/options", controller.signal)
      .then((loaded) => { if (!controller.signal.aborted) { setTaxonomy(loaded); setTaxonomyState("ready"); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setTaxonomyError(errorMessage(reason, "Unable to load approved taxonomy options.")); setTaxonomyState("error"); } });
  }, []);
  const loadProposals = useCallback(() => {
    proposalRequestController.current?.abort();
    const controller = new AbortController();
    proposalRequestController.current = controller;
    setProposalState("loading"); setProposalError("");
    getJSON<SellerTaxonomyProposal[]>("/seller/taxonomy/proposals", controller.signal)
      .then((loaded) => {
        if (!Array.isArray(loaded)) throw new Error("Unexpected taxonomy proposal response.");
        if (!controller.signal.aborted) { setProposals(loaded); setProposalState("ready"); }
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setProposalError(errorMessage(reason, "Unable to load your taxonomy proposals.")); setProposalState("error"); } });
  }, []);
  useEffect(() => {
    void Promise.resolve().then(loadTaxonomy); void Promise.resolve().then(loadProposals);
    return () => { taxonomyRequestController.current?.abort(); proposalRequestController.current?.abort(); };
  }, [loadProposals, loadTaxonomy]);

  const beginMutation = (id: string) => {
    if (pendingMutationIds.current.has(id)) return false;
    pendingMutationIds.current.add(id); setPendingIds((current) => new Set([...current, id]));
    setFeedback((current) => { const { [id]: _, ...remaining } = current; return remaining; });
    return true;
  };
  const finishMutation = (id: string) => {
    pendingMutationIds.current.delete(id);
    setPendingIds((current) => { const next = new Set(current); next.delete(id); return next; });
  };
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const subcategories = useMemo(() => taxonomy.subcategories.filter((subcategory) => subcategory.categoryId === selectedCategoryId), [selectedCategoryId, taxonomy.subcategories]);

  async function classifyProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const product = products.find((item) => item.id === String(form.get("productId") ?? ""));
    const categoryId = String(form.get("categoryId") ?? "");
    const subcategoryId = String(form.get("subcategoryId") ?? "");
    const brandId = String(form.get("brandId") ?? "");
    if (!product || !categoryId) { setClassificationFeedback({ kind: "error", message: "Choose a product and an approved category." }); return; }
    const payload = { categoryId, ...(subcategoryId ? { subcategoryId } : {}), ...(brandId ? { brandId } : {}) };
    setSavingClassification(true); setClassificationFeedback(null);
    try {
      const response = await patchJSON<{ product: SellerProduct }>(`/seller/taxonomy/products/${product.id}/classification`, payload);
      onClassified({ ...response.product, isPublished: false });
      setClassificationFeedback({ kind: "success", message: "Classification saved. This product is now a draft and requires moderation before publication." });
    } catch (reason: unknown) { setClassificationFeedback({ kind: "error", message: errorMessage(reason, "Unable to classify this product.") }); }
    finally { setSavingClassification(false); }
  }
  async function submitProposal(kind: SellerTaxonomyKind, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form); const id = `create-${kind}`;
    const categoryId = String(data.get("categoryId") ?? "");
    if (kind === "subcategory" && !categoryId) { setFeedback((current) => ({ ...current, [id]: { kind: "error", message: "Choose an approved parent category." } })); return; }
    if (!beginMutation(id)) return;
    const payload = { kind, name: String(data.get("name") ?? "").trim(), slug: String(data.get("slug") ?? "").trim(), ...(kind === "subcategory" ? { categoryId } : {}) };
    try {
      const { proposal } = await postJSON<{ proposal: SellerTaxonomyProposal }>("/seller/taxonomy/proposals", payload);
      setProposals((current) => [proposal, ...current]); form.reset();
      setFeedback((current) => ({ ...current, [id]: { kind: "success", message: `${titleFor(kind)} proposal submitted for review.` } }));
    } catch (reason: unknown) { setFeedback((current) => ({ ...current, [id]: { kind: "error", message: errorMessage(reason, "Unable to submit taxonomy proposal.") } })); }
    finally { finishMutation(id); }
  }
  async function withdrawProposal(proposal: SellerTaxonomyProposal) {
    if (!beginMutation(proposal.id)) return;
    try {
      await deleteJSON<void>(`/seller/taxonomy/proposals/${proposal.id}`);
      setProposals((current) => current.map((item) => item.id === proposal.id ? { ...item, status: "withdrawn" } : item));
      setFeedback((current) => ({ ...current, [proposal.id]: { kind: "success", message: "Proposal withdrawn." } }));
      setWithdrawalConfirmation(null);
    } catch (reason: unknown) { setFeedback((current) => ({ ...current, [proposal.id]: { kind: "error", message: errorMessage(reason, "Unable to withdraw proposal.") } })); }
    finally { finishMutation(proposal.id); }
  }
  const proposalForm = (kind: SellerTaxonomyKind) => {
    const id = `create-${kind}`;
    const isPending = pendingIds.has(id);
    const itemFeedback = feedback[id];
    return <form className="seller-taxonomy-proposal-form" aria-label={`Propose ${kind}`} onSubmit={(event) => void submitProposal(kind, event)}>
      <h3>Propose a {kind}</h3>
      <label>Name<input required name="name" minLength={1} maxLength={120} disabled={isPending} /></label>
      <label>Slug<input required name="slug" minLength={1} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Use lowercase letters, numbers, and hyphens." disabled={isPending} /></label>
      {kind === "subcategory" && <label>Parent category<select required name="categoryId" defaultValue="" disabled={isPending}><option value="" disabled>Select an approved category</option>{taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
      <button type="submit" disabled={isPending}>{isPending ? "Submitting…" : `Submit ${kind} proposal`}</button>
      {itemFeedback && <p role={itemFeedback.kind === "error" ? "alert" : "status"}>{itemFeedback.message}</p>}
    </form>;
  };

  return <section className={`seller-taxonomy ${styles.surface}`} aria-labelledby="seller-taxonomy-heading">
    <div><p className="eyebrow">Approved catalog vocabulary</p><h2 id="seller-taxonomy-heading">Classify products and propose missing terms</h2><p className="seller-form-note">Only approved terms can classify a product. Classification returns the product to draft for moderation.</p></div>
    {taxonomyState === "loading" ? <p className="seller-state" role="status" aria-live="polite">Loading approved taxonomy options…</p> : taxonomyState === "error" ? <div className="seller-empty" role="alert"><strong>Unable to load approved taxonomy options.</strong><p>{taxonomyError}</p><button type="button" onClick={loadTaxonomy} aria-label="Retry approved taxonomy options">Retry options</button></div> : <>
      <form className="seller-taxonomy-classification" aria-label="Classify an owned product" onSubmit={(event) => void classifyProduct(event)}>
        <h3>Classify an existing product</h3><label>Product<select required name="productId" value={selectedProductId} onChange={(event) => { setSelectedProductId(event.target.value); setSelectedCategoryId(""); }} disabled={savingClassification}><option value="" disabled>Select a product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label>Category<select required name="categoryId" value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)} disabled={savingClassification}><option value="" disabled>Select an approved category</option>{taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Subcategory (optional)<select name="subcategoryId" defaultValue="" disabled={!selectedCategoryId || savingClassification}><option value="">No subcategory</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></label>
        <label>Brand (optional)<select name="brandId" defaultValue="" disabled={savingClassification}><option value="">No brand</option>{taxonomy.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
        <button type="submit" disabled={!selectedProduct || !selectedCategoryId || savingClassification}>{savingClassification ? "Saving classification…" : "Save classification"}</button>
        {selectedProduct?.isPublished && <p className="seller-form-note">Saving classification will make this published product a draft.</p>}{classificationFeedback && <p role={classificationFeedback.kind === "error" ? "alert" : "status"}>{classificationFeedback.message}</p>}
      </form>
      <div className="seller-taxonomy-proposals">{proposalForm("category")}{proposalForm("subcategory")}{proposalForm("brand")}</div>
    </>}
    <section aria-labelledby="seller-taxonomy-proposals-heading"><h3 id="seller-taxonomy-proposals-heading">Your taxonomy proposals</h3>{proposalState === "loading" ? <p className="seller-state" role="status" aria-live="polite">Loading your taxonomy proposals…</p> : proposalState === "error" ? <div className="seller-empty" role="alert"><strong>Unable to load your taxonomy proposals.</strong><p>{proposalError}</p><button type="button" onClick={loadProposals} aria-label="Retry your taxonomy proposals">Retry proposals</button></div> : proposals.length ? <div className="seller-taxonomy-proposal-list">{proposals.map((proposal) => { const isPending = pendingIds.has(proposal.id); const itemFeedback = feedback[proposal.id]; return <article key={proposal.id} className="seller-taxonomy-proposal"><div><strong>{proposal.name}</strong><small>{proposal.kind} · {proposal.slug}{proposal.categoryId ? ` · parent ${proposal.categoryId}` : ""}</small><span className="status">{proposal.status}</span></div>{proposal.status === "pending" && <button type="button" onClick={() => setWithdrawalConfirmation(proposal)} disabled={isPending}>{isPending ? "Withdrawing…" : "Withdraw proposal"}</button>}{itemFeedback && <p role={itemFeedback.kind === "error" ? "alert" : "status"}>{itemFeedback.message}</p>}</article>; })}</div> : <p className="seller-state">No taxonomy proposals yet.</p>}</section>
    {withdrawalConfirmation && <ConfirmationDialog title="Withdraw proposal?" description={`This withdraws “${withdrawalConfirmation.name}” from review. You will need to submit a new proposal to request it again.`} confirmLabel="Confirm withdrawal" cancelLabel="Cancel withdrawal" tone="danger" pending={pendingIds.has(withdrawalConfirmation.id)} onCancel={() => setWithdrawalConfirmation(null)} onConfirm={() => void withdrawProposal(withdrawalConfirmation)} />}
  </section>;
}
