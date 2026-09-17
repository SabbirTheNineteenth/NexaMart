import type { AuditDatabase } from "../../audit/audit.repository.js";
import { TaxonomyConflictError, TaxonomyNotFoundError, TaxonomyValidationError, type ActiveTaxonomy, type CanonicalInput, type TaxonomyKind, type TaxonomyProposal, type TaxonomyRepository, type TaxonomyStatus } from "../taxonomy.repository.js";

type Audit = { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> };

export class TaxonomyService {
  constructor(private readonly repository: TaxonomyRepository, private readonly audit: Audit) {}
  listCanonical() { return this.repository.listCanonical(); }
  activeOptions(): Promise<ActiveTaxonomy> { return this.repository.activeOptions(); }
  listSellerProposals(sellerId: string) { return this.repository.listSellerProposals(sellerId); }
  listProposals(status?: TaxonomyStatus) { return this.repository.listProposals(status); }

  async createCanonical(input: CanonicalInput & { adminId: string }) {
    return this.inTransaction(async (repository, database) => {
      await this.assertParentActive(repository, input);
      if (await repository.findCanonicalBySlug(input.kind, input.slug, input.categoryId)) throw new TaxonomyConflictError();
      const node = await repository.createCanonical(input);
      if (!node) throw new TaxonomyValidationError("Category is not active");
      await this.audit.record({ actorId: input.adminId, action: `taxonomy.${input.kind}.created`, resourceType: input.kind, resourceId: node.id, metadata: { slug: node.slug } }, database);
      return node;
    });
  }

  async updateCanonical(input: { kind: TaxonomyKind; id: string; name?: string; slug?: string; categoryId?: string; isActive?: boolean; adminId: string }) {
    return this.inTransaction(async (repository, database) => {
      await this.assertParentActive(repository, input);
      if (input.slug) { const existing = await repository.findCanonicalBySlug(input.kind, input.slug, input.categoryId); if (existing && existing.id !== input.id) throw new TaxonomyConflictError(); }
      const node = await repository.updateCanonical(input);
      if (!node) {
        await this.assertParentActive(repository, input);
        throw new TaxonomyNotFoundError("Taxonomy node not found");
      }
      const archivedSubcategoryCount = input.kind === "category" && input.isActive === false ? await repository.archiveSubcategories(input.id) : 0;
      await this.audit.record({ actorId: input.adminId, action: `taxonomy.${input.kind}.updated`, resourceType: input.kind, resourceId: node.id, metadata: { fields: Object.keys(input).filter((key) => !["id", "kind", "adminId"].includes(key)), ...(archivedSubcategoryCount ? { archivedSubcategoryCount } : {}) } }, database);
      return node;
    });
  }

  async classifyProduct(input: { sellerId: string; productId: string; categoryId: string; subcategoryId?: string; brandId?: string }) {
    const options = await this.repository.activeOptions();
    if (!options.categories.some((node) => node.id === input.categoryId)) throw new TaxonomyValidationError("Category is not active");
    if (input.subcategoryId) {
      const subcategory = options.subcategories.find((node) => node.id === input.subcategoryId);
      if (!subcategory) throw new TaxonomyValidationError("Subcategory is not active");
      if (subcategory.categoryId !== input.categoryId) throw new TaxonomyValidationError("Subcategory does not belong to category");
    }
    if (input.brandId && !options.brands.some((node) => node.id === input.brandId)) throw new TaxonomyValidationError("Brand is not active");
    const product = await this.repository.classifyProduct(input);
    if (!product) throw new TaxonomyNotFoundError("Product not found");
    return product;
  }

  async submitProposal(input: { sellerId: string; kind: TaxonomyKind; name: string; slug: string; categoryId?: string }): Promise<TaxonomyProposal> {
    if (input.kind === "subcategory") {
      if (!input.categoryId) throw new TaxonomyValidationError("Subcategory proposal requires a category");
      const options = await this.repository.activeOptions();
      if (!options.categories.some((category) => category.id === input.categoryId)) throw new TaxonomyValidationError("Category is not active");
    }
    return this.inTransaction(async (repository, database) => {
      if (await repository.findCanonicalBySlug(input.kind, input.slug, input.categoryId)) throw new TaxonomyConflictError();
      if (await repository.findPendingProposal(input)) throw new TaxonomyConflictError("Taxonomy proposal already pending");
      const submitted = await repository.createProposal(input);
      await this.audit.record({ actorId: input.sellerId, action: "taxonomy.proposal.submitted", resourceType: "taxonomy_proposal", resourceId: submitted.id, metadata: { kind: submitted.kind, slug: submitted.slug } }, database);
      return submitted;
    });
  }
  async withdrawProposal(input: { sellerId: string; proposalId: string }) {
    return this.inTransaction(async (repository, database) => {
      if (!await repository.withdrawProposal(input)) throw new TaxonomyNotFoundError("Proposal not found");
      await this.audit.record({ actorId: input.sellerId, action: "taxonomy.proposal.withdrawn", resourceType: "taxonomy_proposal", resourceId: input.proposalId, metadata: {} }, database);
    });
  }

  async reviewProposal(input: { proposalId: string; decision: "approve" | "reject"; adminId: string; canonicalId?: string; reviewNote?: string }) {
    return this.inTransaction(async (repository, database) => {
      const proposal = await repository.findProposal(input.proposalId);
      if (!proposal || proposal.status !== "pending") throw new TaxonomyNotFoundError("Proposal not found");
      let canonicalId = input.canonicalId;
      if (input.decision === "approve") {
        await this.assertParentActive(repository, proposal);
        const duplicate = canonicalId ? this.canonicalMatchesProposal(await repository.listCanonical(), proposal, canonicalId) : await repository.findCanonicalBySlug(proposal.kind, proposal.slug, proposal.categoryId ?? undefined);
        const canonical = duplicate ?? await repository.createCanonical({ kind: proposal.kind, name: proposal.name, slug: proposal.slug, ...(proposal.categoryId ? { categoryId: proposal.categoryId } : {}) });
        if (!canonical) throw new TaxonomyValidationError("Category is not active");
        canonicalId = canonical.id;
      }
      if (!await repository.reviewProposal({ proposalId: proposal.id, status: input.decision === "approve" ? "approved" : "rejected", canonicalId, reviewNote: input.reviewNote, reviewedById: input.adminId, ...(input.decision === "approve" && proposal.kind === "subcategory" && proposal.categoryId ? { activeCategoryId: proposal.categoryId } : {}) })) {
        await this.assertParentActive(repository, proposal);
        throw new TaxonomyNotFoundError("Proposal not found");
      }
      const status = input.decision === "approve" ? "approved" : "rejected";
      await this.audit.record({ actorId: input.adminId, action: `taxonomy.proposal.${status}`, resourceType: "taxonomy_proposal", resourceId: proposal.id, metadata: { ...(canonicalId ? { canonicalId } : {}), kind: proposal.kind } }, database);
      return { ...proposal, status, ...(canonicalId ? { canonicalId } : {}) };
    });
  }

  private async assertParentActive(repository: TaxonomyRepository, input: { kind: TaxonomyKind; id?: string; categoryId?: string | null; isActive?: boolean }) {
    if (input.kind !== "subcategory") return;
    const categoryId = input.categoryId ?? (input.id ? (await repository.listCanonical()).subcategories.find((subcategory) => subcategory.id === input.id)?.categoryId : undefined);
    if (!categoryId) return;
    const options = await repository.activeOptions();
    if (!options.categories.some((category) => category.id === categoryId)) throw new TaxonomyValidationError("Category is not active");
  }
  private canonicalMatchesProposal(nodes: Awaited<ReturnType<TaxonomyRepository["listCanonical"]>>, proposal: TaxonomyProposal, canonicalId: string) {
    const canonical = proposal.kind === "category" ? nodes.categories.find((node) => node.id === canonicalId) : proposal.kind === "brand" ? nodes.brands.find((node) => node.id === canonicalId) : nodes.subcategories.find((node) => node.id === canonicalId && node.categoryId === proposal.categoryId);
    if (!canonical) throw new TaxonomyValidationError("Canonical taxonomy node does not match proposal");
    return { id: canonical.id };
  }
  private inTransaction<T>(work: (repository: TaxonomyRepository, database: AuditDatabase) => Promise<T>) {
    if (!this.audit || !this.repository.withTransaction) throw new Error("Transaction and audit support are required");
    return this.repository.withTransaction(work);
  }
}
