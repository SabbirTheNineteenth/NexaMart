import type { AuditDatabase } from "../audit/audit.repository.js";

export type TaxonomyKind = "category" | "subcategory" | "brand";
export type TaxonomyStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type TaxonomyNode = { id: string; name: string; slug: string; isActive: boolean };
export type TaxonomySubcategory = TaxonomyNode & { categoryId: string };
export type TaxonomyProposal = { id: string; sellerId: string; kind: TaxonomyKind; name: string; slug: string; categoryId: string | null; status: TaxonomyStatus; canonicalId?: string | null; reviewNote?: string | null; createdAt?: string };
export type SellerTaxonomyProduct = { id: string; sellerId: string; name: string; brand?: string; stock: number; isPublished: boolean; categoryId: string | null; subcategoryId: string | null; brandId: string | null };
export type ActiveTaxonomy = { categories: Omit<TaxonomyNode, "isActive">[]; subcategories: (Omit<TaxonomySubcategory, "isActive">)[]; brands: Omit<TaxonomyNode, "isActive">[] };
export type CanonicalInput = { kind: TaxonomyKind; name: string; slug: string; categoryId?: string };

export class TaxonomyConflictError extends Error { constructor(message = "Taxonomy slug already exists") { super(message); } }
export class TaxonomyValidationError extends Error {}
export class TaxonomyNotFoundError extends Error {}

export type TaxonomyRepository = {
  listCanonical(): Promise<{ categories: TaxonomyNode[]; subcategories: TaxonomySubcategory[]; brands: TaxonomyNode[] }>;
  activeOptions(): Promise<ActiveTaxonomy>;
  findCanonicalBySlug(kind: TaxonomyKind, slug: string, categoryId?: string): Promise<{ id: string } | null>;
  findPendingProposal(input: { sellerId: string; kind: TaxonomyKind; slug: string; categoryId?: string }): Promise<{ id: string } | null>;
  createCanonical(input: CanonicalInput): Promise<(TaxonomyNode | TaxonomySubcategory) | null>;
  updateCanonical(input: { kind: TaxonomyKind; id: string; name?: string; slug?: string; categoryId?: string; isActive?: boolean }): Promise<(TaxonomyNode | TaxonomySubcategory) | null>;
  archiveSubcategories(categoryId: string): Promise<number>;
  classifyProduct(input: { sellerId: string; productId: string; categoryId: string; subcategoryId?: string; brandId?: string }): Promise<SellerTaxonomyProduct | null>;
  createProposal(input: { sellerId: string; kind: TaxonomyKind; name: string; slug: string; categoryId?: string }): Promise<TaxonomyProposal>;
  listSellerProposals(sellerId: string): Promise<TaxonomyProposal[]>;
  listProposals(status?: TaxonomyStatus): Promise<TaxonomyProposal[]>;
  withdrawProposal(input: { sellerId: string; proposalId: string }): Promise<boolean>;
  findProposal(proposalId: string): Promise<TaxonomyProposal | null>;
  reviewProposal(input: { proposalId: string; status: "approved" | "rejected"; canonicalId?: string; reviewNote?: string; reviewedById: string; activeCategoryId?: string }): Promise<boolean>;
  withTransaction<T>(work: (repository: TaxonomyRepository, database: AuditDatabase) => Promise<T>): Promise<T>;
};
