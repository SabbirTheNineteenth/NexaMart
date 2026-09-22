"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Network, Tags } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiError, getJSON, patchJSON, postJSON } from "@/lib/api";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import type { AdminTaxonomyKind, AdminTaxonomyNode, AdminTaxonomyPayload, AdminTaxonomyProposal } from "@/types/admin";

type LoadState = "loading" | "ready" | "error";
type Feedback = { kind: "success" | "error"; message: string };
type ArchiveConfirmation = { kind: AdminTaxonomyKind; node: AdminTaxonomyNode; form: HTMLFormElement };
type NodeUpdateConfirmation = { kind: AdminTaxonomyKind; node: AdminTaxonomyNode; form: HTMLFormElement };
type ProposalReviewConfirmation = { proposal: AdminTaxonomyProposal; decision: "approve" | "reject"; form: HTMLFormElement };

type TaxonomyPlural = "categories" | "subcategories" | "brands";
const pluralFor = (kind: AdminTaxonomyKind): TaxonomyPlural => kind === "category" ? "categories" : kind === "subcategory" ? "subcategories" : "brands";
const taxonomyCreateDetails: Record<AdminTaxonomyKind, { title: string; eyebrow: string; heading: string; description: string; formTitle: string; guidance: string }> = {
  category: {
    title: "Category identity",
    eyebrow: "Catalog / Categories",
    heading: "Create a category",
    description: "Add a canonical category using the supported catalog vocabulary fields.",
    formTitle: "Category details",
    guidance: "Create a top-level catalog department.",
  },
  subcategory: {
    title: "Subcategory hierarchy",
    eyebrow: "Catalog / Subcategories",
    heading: "Create a subcategory",
    description: "Add a canonical subcategory and place it under its existing parent category.",
    formTitle: "Subcategory details",
    guidance: "Place a more specific term under an existing category.",
  },
  brand: {
    title: "Brand identity",
    eyebrow: "Catalog / Brands",
    heading: "Create a brand",
    description: "Add a canonical brand using the supported catalog vocabulary fields.",
    formTitle: "Brand details",
    guidance: "Add an approved manufacturer or marketplace brand.",
  },
};
const taxonomyCreateIcons: Record<AdminTaxonomyKind, LucideIcon> = { category: Tags, subcategory: Network, brand: BadgeCheck };
const errorMessage = (reason: unknown, fallback: string) => {
  if (reason instanceof ApiError && reason.status === 409) return "That canonical slug already exists. Choose a different slug.";
  return reason instanceof Error ? reason.message : fallback;
};
const sortNodes = (nodes: AdminTaxonomyNode[]) => [...nodes].sort((left, right) => left.name.localeCompare(right.name));

export function AdminTaxonomyManagement({ createKind }: { createKind?: AdminTaxonomyKind }) {
  const [taxonomy, setTaxonomy] = useState<AdminTaxonomyPayload>({ categories: [], subcategories: [], brands: [] });
  const [proposals, setProposals] = useState<AdminTaxonomyProposal[]>([]);
  const [taxonomyState, setTaxonomyState] = useState<LoadState>("loading");
  const [proposalState, setProposalState] = useState<LoadState>("loading");
  const [taxonomyError, setTaxonomyError] = useState("");
  const [proposalError, setProposalError] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [archiveConfirmation, setArchiveConfirmation] = useState<ArchiveConfirmation | null>(null);
  const [nodeUpdateConfirmation, setNodeUpdateConfirmation] = useState<NodeUpdateConfirmation | null>(null);
  const [proposalReviewConfirmation, setProposalReviewConfirmation] = useState<ProposalReviewConfirmation | null>(null);
  const taxonomyRequestController = useRef<AbortController | null>(null);
  const proposalRequestController = useRef<AbortController | null>(null);
  const pendingMutationIds = useRef(new Set<string>());
  const taxonomyRevision = useRef(0);

  const loadTaxonomy = useCallback(async () => {
    const requestRevision = ++taxonomyRevision.current;
    taxonomyRequestController.current?.abort();
    const controller = new AbortController();
    taxonomyRequestController.current = controller;
    setTaxonomyState("loading");
    setTaxonomyError("");
    try {
      const loaded = await getJSON<AdminTaxonomyPayload>("/admin/taxonomy", controller.signal);
      if (requestRevision === taxonomyRevision.current && !controller.signal.aborted) { setTaxonomy({ categories: sortNodes(loaded.categories), subcategories: sortNodes(loaded.subcategories), brands: sortNodes(loaded.brands) }); setTaxonomyState("ready"); }
    } catch (reason: unknown) {
      if (requestRevision === taxonomyRevision.current && !controller.signal.aborted) { setTaxonomyError(errorMessage(reason, "Unable to load canonical taxonomy.")); setTaxonomyState("error"); }
    }
  }, []);

  const loadProposals = useCallback(() => {
    proposalRequestController.current?.abort();
    const controller = new AbortController();
    proposalRequestController.current = controller;
    setProposalState("loading");
    setProposalError("");
    getJSON<AdminTaxonomyProposal[]>("/admin/taxonomy/proposals?status=pending", controller.signal)
      .then((loaded) => { if (!controller.signal.aborted) { setProposals(loaded); setProposalState("ready"); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setProposalError(errorMessage(reason, "Unable to load pending taxonomy proposals.")); setProposalState("error"); } });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadTaxonomy);
    void Promise.resolve().then(loadProposals);
    return () => { taxonomyRequestController.current?.abort(); proposalRequestController.current?.abort(); };
  }, [loadProposals, loadTaxonomy]);

  const beginMutation = (id: string) => {
    if (pendingMutationIds.current.has(id)) return false;
    pendingMutationIds.current.add(id);
    setPendingIds((current) => new Set([...current, id]));
    setFeedback((current) => { const { [id]: _, ...remaining } = current; return remaining; });
    return true;
  };
  const finishMutation = (id: string) => {
    pendingMutationIds.current.delete(id);
    setPendingIds((current) => { const next = new Set(current); next.delete(id); return next; });
  };

  async function createNode(kind: AdminTaxonomyKind, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const plural = pluralFor(kind);
    const id = `create-${kind}`;
    if (!beginMutation(id)) return;
    const mutationRevision = taxonomyRevision.current;
    const payload = { name: String(data.get("name") ?? "").trim(), slug: String(data.get("slug") ?? "").trim(), ...(kind === "subcategory" ? { categoryId: String(data.get("categoryId") ?? "") } : {}) };
    try {
      const { node } = await postJSON<{ node: AdminTaxonomyNode }>(`/admin/taxonomy/${plural}`, payload);
      if (mutationRevision === taxonomyRevision.current) { setTaxonomy((current) => ({ ...current, [plural]: sortNodes([...current[plural], node]) })); }
      form.reset();
      setFeedback((current) => ({ ...current, [id]: { kind: "success", message: `${kind[0].toUpperCase()}${kind.slice(1)} created.` } }));
    } catch (reason: unknown) {
      setFeedback((current) => ({ ...current, [id]: { kind: "error", message: errorMessage(reason, "Unable to create canonical taxonomy node.") } }));
    } finally { finishMutation(id); }
  }

  async function updateNode(kind: AdminTaxonomyKind, node: AdminTaxonomyNode, form: HTMLFormElement) {
    const data = new FormData(form);
    const plural = pluralFor(kind);
    if (!beginMutation(node.id)) return;
    const mutationRevision = taxonomyRevision.current;
    const payload = { name: String(data.get("name") ?? "").trim(), slug: String(data.get("slug") ?? "").trim(), isActive: data.get("isActive") === "on", ...(kind === "subcategory" ? { categoryId: String(data.get("categoryId") ?? "") } : {}) };
    try {
      const { node: updated } = await patchJSON<{ node: AdminTaxonomyNode }>(`/admin/taxonomy/${plural}/${node.id}`, payload);
      if (kind === "category" && !updated.isActive) { await loadTaxonomy(); }
      else if (mutationRevision === taxonomyRevision.current) { setTaxonomy((current) => ({ ...current, [plural]: sortNodes(current[plural].map((item) => item.id === updated.id ? updated : item)) })); }
      setFeedback((current) => ({ ...current, [node.id]: { kind: "success", message: `${updated.name} saved.` } }));
    } catch (reason: unknown) {
      setFeedback((current) => ({ ...current, [node.id]: { kind: "error", message: errorMessage(reason, "Unable to update canonical taxonomy node.") } }));
    } finally { finishMutation(node.id); }
  }

  function requestNodeUpdate(kind: AdminTaxonomyKind, node: AdminTaxonomyNode, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const isActive = new FormData(form).get("isActive") === "on";
    if (!isActive && node.isActive) setArchiveConfirmation({ kind, node, form });
    else setNodeUpdateConfirmation({ kind, node, form });
  }

  function confirmArchive() {
    if (!archiveConfirmation) return;
    const confirmed = archiveConfirmation;
    void (async () => {
      await updateNode(confirmed.kind, confirmed.node, confirmed.form);
      setArchiveConfirmation(null);
    })();
  }

  function confirmNodeUpdate() {
    if (!nodeUpdateConfirmation) return;
    const confirmed = nodeUpdateConfirmation;
    void (async () => {
      await updateNode(confirmed.kind, confirmed.node, confirmed.form);
      setNodeUpdateConfirmation(null);
    })();
  }

  async function reviewProposal(proposal: AdminTaxonomyProposal, decision: "approve" | "reject", form: HTMLFormElement) {
    const data = new FormData(form);
    const canonicalId = String(data.get("canonicalId") ?? "");
    const reviewNote = String(data.get("reviewNote") ?? "").trim();
    if (!beginMutation(proposal.id)) return;
    try {
      await postJSON<{ proposal: AdminTaxonomyProposal }>(`/admin/taxonomy/proposals/${proposal.id}/review`, { decision, ...(canonicalId ? { canonicalId } : {}), ...(reviewNote ? { reviewNote } : {}) });
      setProposals((current) => current.filter((item) => item.id !== proposal.id));
      setFeedback((current) => ({ ...current, [proposal.id]: { kind: "success", message: `Proposal ${decision}d.` } }));
    } catch (reason: unknown) {
      setFeedback((current) => ({ ...current, [proposal.id]: { kind: "error", message: errorMessage(reason, "Unable to review taxonomy proposal.") } }));
    } finally { finishMutation(proposal.id); }
  }

  function requestProposalReview(proposal: AdminTaxonomyProposal, decision: "approve" | "reject", event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposalReviewConfirmation({ proposal, decision, form: event.currentTarget });
  }

  function confirmProposalReview() {
    if (!proposalReviewConfirmation) return;
    const confirmed = proposalReviewConfirmation;
    void (async () => {
      await reviewProposal(confirmed.proposal, confirmed.decision, confirmed.form);
      setProposalReviewConfirmation(null);
    })();
  }

  const nodesFor = (kind: AdminTaxonomyKind) => taxonomy[pluralFor(kind)];
  const canonicalOptions = (proposal: AdminTaxonomyProposal) => proposal.kind === "subcategory" ? taxonomy.subcategories.filter((node) => node.categoryId === proposal.categoryId) : nodesFor(proposal.kind);
  const createForm = (kind: AdminTaxonomyKind, focused = false) => {
    const id = `create-${kind}`; const isPending = pendingIds.has(id); const itemFeedback = feedback[id];
    const detail = taxonomyCreateDetails[kind];
    const Icon = taxonomyCreateIcons[kind];
    return <form className={`admin-category-create admin-inspector-form${focused ? "" : " admin-taxonomy-create-card"}`} data-taxonomy-create-kind={kind} aria-label={`Create canonical ${kind}`} onSubmit={(event) => void createNode(kind, event)}>
      <div className="admin-taxonomy-form-heading">{!focused && <Icon className="admin-taxonomy-create-icon" aria-hidden="true" size={18} strokeWidth={1.8} />}<div><h3>{focused ? detail.formTitle : `Create ${kind}`}</h3><p>{focused ? "Complete the supported fields below." : detail.guidance}</p>{!focused && kind === "subcategory" && <small>Parent category is required before this term can be created.</small>}</div></div>
      <fieldset className="admin-taxonomy-fields">
        {kind === "subcategory" && <label>Parent category<select required name="categoryId" defaultValue=""><option value="" disabled>Select a category</option>{taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}
        <label>Name<input required name="name" minLength={1} maxLength={120} autoComplete="off" /></label><label>Slug<input required name="slug" minLength={1} maxLength={100} autoComplete="off" pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Use lowercase letters, numbers, and hyphens." /></label>
      </fieldset>
      <div className="admin-taxonomy-row-actions"><button className="primary-button admin-taxonomy-action" type="submit" disabled={isPending}>{isPending ? "Creating…" : `Create ${kind}`}</button></div>{itemFeedback && <p aria-live="polite" role={itemFeedback.kind === "error" ? "alert" : "status"}>{itemFeedback.message}</p>}
    </form>;
  };

  if (createKind) { const detail = taxonomyCreateDetails[createKind]; return <section className="admin-panel admin-taxonomy admin-taxonomy-create-page" data-admin-taxonomy-kind={createKind} aria-labelledby="taxonomy-create-heading">
    <div className="admin-panel-head"><div><p className="eyebrow">{detail.eyebrow}</p><h2 id="taxonomy-create-heading">{detail.heading}</h2><p>{detail.description}</p></div><div className="admin-taxonomy-create-header-actions"><Link className="admin-context-link" href="/admin/taxonomy">Manage taxonomy</Link><Link className="admin-context-link" href="/admin/products">Back to products</Link></div></div>
    {taxonomyState === "loading" ? <p className="admin-state">Loading catalog vocabulary…</p> : taxonomyState === "error" ? <div className="admin-empty" role="alert"><strong>Unable to prepare this create form.</strong><p>{taxonomyError}</p><button type="button" onClick={loadTaxonomy}>Try again</button></div> : <div className="admin-taxonomy-focused-form">{createForm(createKind, true)}<aside className="admin-taxonomy-create-context"><strong>{detail.title}</strong><p>{detail.guidance}</p>{createKind === "subcategory" && <p>Parent category choices come from the current canonical taxonomy.</p>}</aside></div>}
      </section>;
  }

  return <section className="admin-panel admin-taxonomy" aria-labelledby="taxonomy-heading">
    <div className="admin-panel-head"><div><p className="eyebrow">Catalog governance</p><h2 id="taxonomy-heading">Canonical taxonomy governance</h2><p>Maintain active and archived catalog vocabulary, then review pending seller proposals.</p></div><span>{taxonomyState === "loading" ? "Loading" : `${taxonomy.categories.length + taxonomy.subcategories.length + taxonomy.brands.length} nodes`}</span></div>
    {taxonomyState === "loading" ? <p className="admin-state">Loading canonical taxonomy…</p> : taxonomyState === "error" ? <div className="admin-empty" role="alert"><strong>Unable to load canonical taxonomy.</strong><p>{taxonomyError}</p><button type="button" onClick={loadTaxonomy} aria-label="Retry taxonomy records">Try again</button></div> : <div className="admin-taxonomy-workspace">
      <section className="admin-taxonomy-create-group" aria-labelledby="taxonomy-create-group-heading"><div className="admin-taxonomy-section-head admin-taxonomy-create-section-head"><div><p className="eyebrow">Catalog vocabulary</p><h3 id="taxonomy-create-group-heading">Create taxonomy records</h3><p>Add approved categories, subcategories, and brands for seller catalog classification.</p><small>Create only canonical terms that should be available in future seller workflows.</small></div></div><div className="admin-taxonomy-create-stack">{createForm("category")}{createForm("subcategory")}{createForm("brand")}</div></section>
      <section className="admin-taxonomy-records" aria-label="Canonical taxonomy records">{(["category", "subcategory", "brand"] as const).map((kind) => <section className="admin-taxonomy-record-group" key={kind} aria-labelledby={`${kind}-nodes-heading`}><div className="admin-taxonomy-section-head"><h3 id={`${kind}-nodes-heading`}>{kind[0].toUpperCase()}{kind.slice(1)} records</h3><span>{nodesFor(kind).length} total</span></div>{nodesFor(kind).length ? <div className="admin-category-list">{nodesFor(kind).map((node) => { const isPending = pendingIds.has(node.id); const itemFeedback = feedback[node.id]; return <form className="admin-category-row" key={node.id} aria-label={`Edit ${node.name}`} onSubmit={(event) => requestNodeUpdate(kind, node, event)}><div className="admin-taxonomy-row-heading"><strong>{node.name}</strong><span>{node.isActive ? "Active" : "Archived"}</span></div><fieldset className="admin-taxonomy-fields"><label>Name<input required name="name" defaultValue={node.name} /></label><label>Slug<input required name="slug" defaultValue={node.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>{kind === "subcategory" && <label>Parent category<select required name="categoryId" defaultValue={node.categoryId ?? ""}>{taxonomy.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>}<label className="admin-taxonomy-availability"><input name="isActive" type="checkbox" defaultChecked={node.isActive} /> Available for new classifications</label></fieldset><div className="admin-taxonomy-row-actions"><button className="admin-taxonomy-action" type="submit" disabled={isPending}>{isPending ? "Saving…" : "Review changes"}</button></div>{itemFeedback && <p aria-live="polite" role={itemFeedback.kind === "error" ? "alert" : "status"}>{itemFeedback.message}</p>}</form>; })}</div> : <p className="admin-state">No {pluralFor(kind)} yet. Create the first one above.</p>}</section>)}</section>
    </div>}
    <section className="admin-taxonomy-proposals" aria-labelledby="taxonomy-proposals-heading"><div className="admin-panel-head"><div><p className="eyebrow">Proposal queue</p><h3 id="taxonomy-proposals-heading">Pending taxonomy proposals</h3><p>Approve a proposed term or reject it with an optional review note.</p></div><span>{proposalState === "loading" ? "Loading" : `${proposals.length} pending`}</span></div>{proposalState === "loading" ? <p className="admin-state">Loading pending taxonomy proposals…</p> : proposalState === "error" ? <div className="admin-empty" role="alert"><strong>Unable to load pending taxonomy proposals.</strong><p>{proposalError}</p><button type="button" onClick={loadProposals} aria-label="Retry pending taxonomy proposals">Try again</button></div> : proposals.length ? <div className="admin-category-list">{proposals.map((proposal) => { const isPending = pendingIds.has(proposal.id); const itemFeedback = feedback[proposal.id]; const choices = canonicalOptions(proposal); return <form className="admin-category-row" key={proposal.id} aria-label={`Review proposal ${proposal.name}`} onSubmit={(event) => { const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null; requestProposalReview(proposal, submitter?.value === "reject" ? "reject" : "approve", event); }}><div className="admin-taxonomy-row-heading"><strong>{proposal.name}</strong><small>{proposal.kind} · {proposal.slug}{proposal.categoryId ? ` · parent ${proposal.categoryId}` : ""}</small></div><fieldset className="admin-taxonomy-fields"><label>Canonical match (optional)<select name="canonicalId" defaultValue=""><option value="">Create or choose automatically</option>{choices.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>Review note<textarea name="reviewNote" maxLength={1000} /></label></fieldset><div className="admin-taxonomy-proposal-actions"><button className="primary-button admin-taxonomy-action" type="submit" value="approve" disabled={isPending}>{isPending ? "Saving…" : "Approve proposal"}</button><button className="admin-taxonomy-action" type="submit" value="reject" disabled={isPending}>Reject proposal</button></div>{itemFeedback && <p aria-live="polite" role={itemFeedback.kind === "error" ? "alert" : "status"}>{itemFeedback.message}</p>}</form>; })}</div> : <div className="admin-empty"><strong>No pending taxonomy proposals.</strong><p>New seller suggestions will appear here.</p></div>}</section>
    {archiveConfirmation && <ConfirmationDialog title={`Archive ${archiveConfirmation.node.name}?`} description="Archived taxonomy terms are no longer available for new catalog classifications." confirmLabel="Confirm archive" pending={pendingIds.has(archiveConfirmation.node.id)} onCancel={() => setArchiveConfirmation(null)} onConfirm={confirmArchive} />}
    {nodeUpdateConfirmation && <ConfirmationDialog title={`Save changes to ${nodeUpdateConfirmation.node.name}?`} description="This updates the canonical taxonomy term and its classification availability." confirmLabel="Save changes" pending={pendingIds.has(nodeUpdateConfirmation.node.id)} onCancel={() => setNodeUpdateConfirmation(null)} onConfirm={confirmNodeUpdate} />}
    {proposalReviewConfirmation && <ConfirmationDialog title={`${proposalReviewConfirmation.decision === "approve" ? "Approve" : "Reject"} ${proposalReviewConfirmation.proposal.name}?`} description={`This will ${proposalReviewConfirmation.decision} the seller taxonomy proposal.`} confirmLabel={proposalReviewConfirmation.decision === "approve" ? "Approve proposal" : "Reject proposal"} pending={pendingIds.has(proposalReviewConfirmation.proposal.id)} onCancel={() => setProposalReviewConfirmation(null)} onConfirm={confirmProposalReview} />}
  </section>;
}
