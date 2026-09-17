import { and, asc, desc, eq, exists, isNull, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { brands, categories, products, subcategories, taxonomyProposals } from "../../db/schema/index.js";
import type { AuditDatabase, TransactionalDatabase } from "../audit/audit.repository.js";
import type { ActiveTaxonomy, CanonicalInput, TaxonomyKind, TaxonomyProposal, TaxonomyRepository } from "./taxonomy.repository.js";

type TaxonomyTransactionalDatabase = TransactionalDatabase & Pick<typeof db, "execute">;
const node = (row: { id: string; name: string; slug: string; isActive: boolean }) => ({ id: row.id, name: row.name, slug: row.slug, isActive: row.isActive });
const proposal = (row: typeof taxonomyProposals.$inferSelect): TaxonomyProposal => ({ id: row.id, sellerId: row.sellerId, kind: row.kind, name: row.name, slug: row.slug, categoryId: row.categoryId, status: row.status, canonicalId: row.canonicalId, reviewNote: row.reviewNote, createdAt: row.createdAt.toISOString() });

export class PostgresTaxonomyRepository implements TaxonomyRepository {
  constructor(private readonly database: TaxonomyTransactionalDatabase = db) {}
  async withTransaction<T>(work: (repository: TaxonomyRepository, database: AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited taxonomy mutations");
    return this.database.transaction((transaction) => work(new PostgresTaxonomyRepository(transaction), transaction));
  }
  async listCanonical() {
    const [categoryRows, subcategoryRows, brandRows] = await Promise.all([
      this.database.select().from(categories).orderBy(asc(categories.name)), this.database.select().from(subcategories).orderBy(asc(subcategories.name)), this.database.select().from(brands).orderBy(asc(brands.name)),
    ]);
    return { categories: categoryRows.map(node), subcategories: subcategoryRows.map((row) => ({ ...node(row), categoryId: row.categoryId })), brands: brandRows.map(node) };
  }
  async activeOptions(): Promise<ActiveTaxonomy> {
    const [categoryRows, subcategoryRows, brandRows] = await Promise.all([
      this.database.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.name)),
      this.database.select({ id: subcategories.id, categoryId: subcategories.categoryId, name: subcategories.name, slug: subcategories.slug }).from(subcategories).innerJoin(categories, and(eq(subcategories.categoryId, categories.id), eq(categories.isActive, true))).where(eq(subcategories.isActive, true)).orderBy(asc(subcategories.name)),
      this.database.select({ id: brands.id, name: brands.name, slug: brands.slug }).from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.name)),
    ]);
    return { categories: categoryRows, subcategories: subcategoryRows, brands: brandRows };
  }
  async findCanonicalBySlug(kind: TaxonomyKind, slug: string, categoryId?: string) {
    if (kind === "category") return (await this.database.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1))[0] ?? null;
    if (kind === "brand") return (await this.database.select({ id: brands.id }).from(brands).where(eq(brands.slug, slug)).limit(1))[0] ?? null;
    if (!categoryId) return null;
    return (await this.database.select({ id: subcategories.id }).from(subcategories).where(and(eq(subcategories.slug, slug), eq(subcategories.categoryId, categoryId))).limit(1))[0] ?? null;
  }
  async findPendingProposal(input: { sellerId: string; kind: TaxonomyKind; slug: string; categoryId?: string }) {
    return (await this.database.select({ id: taxonomyProposals.id }).from(taxonomyProposals).where(and(eq(taxonomyProposals.sellerId, input.sellerId), eq(taxonomyProposals.kind, input.kind), eq(taxonomyProposals.slug, input.slug), eq(taxonomyProposals.status, "pending"), input.categoryId ? eq(taxonomyProposals.categoryId, input.categoryId) : isNull(taxonomyProposals.categoryId))).limit(1))[0] ?? null;
  }
  async createCanonical(input: CanonicalInput) {
    if (input.kind === "category") return node((await this.database.insert(categories).values({ name: input.name, slug: input.slug }).returning())[0]);
    if (input.kind === "brand") return node((await this.database.insert(brands).values({ name: input.name, slug: input.slug }).returning())[0]);
    await this.lockCategory(input.categoryId!);
    const row = (await this.database.execute(sql`insert into "subcategories" ("name", "slug", "category_id") select ${input.name}, ${input.slug}, "id" from "categories" where "id" = ${input.categoryId!} and "is_active" = true returning "id", "name", "slug", "is_active" as "isActive", "category_id" as "categoryId"`)).rows[0] as { id: string; name: string; slug: string; isActive: boolean; categoryId: string } | undefined;
    if (!row) return null;
    return { ...node(row), categoryId: row.categoryId };
  }
  async updateCanonical(input: { kind: TaxonomyKind; id: string; name?: string; slug?: string; categoryId?: string; isActive?: boolean }) {
    const values = { ...(input.name === undefined ? {} : { name: input.name }), ...(input.slug === undefined ? {} : { slug: input.slug }), ...(input.isActive === undefined ? {} : { isActive: input.isActive }), updatedAt: new Date() };
    if (input.kind === "category") { await this.lockCategory(input.id); const row = (await this.database.update(categories).set(values).where(eq(categories.id, input.id)).returning())[0]; return row ? node(row) : null; }
    if (input.kind === "brand") { const row = (await this.database.update(brands).set(values).where(eq(brands.id, input.id)).returning())[0]; return row ? node(row) : null; }
    const sourceParent = (await this.database.select({ categoryId: subcategories.categoryId }).from(subcategories).where(eq(subcategories.id, input.id)).limit(1))[0]?.categoryId;
    await this.lockCategories([sourceParent, input.categoryId]);
    const activeParent = exists(this.database.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.categoryId ?? subcategories.categoryId), eq(categories.isActive, true))));
    const row = (await this.database.update(subcategories).set({ ...values, ...(input.categoryId ? { categoryId: input.categoryId } : {}) }).where(and(eq(subcategories.id, input.id), activeParent)).returning())[0];
    return row ? { ...node(row), categoryId: row.categoryId } : null;
  }
  async archiveSubcategories(categoryId: string) { return (await this.database.update(subcategories).set({ isActive: false, updatedAt: new Date() }).where(and(eq(subcategories.categoryId, categoryId), eq(subcategories.isActive, true))).returning({ id: subcategories.id })).length; }
  async classifyProduct(input: { sellerId: string; productId: string; categoryId: string; subcategoryId?: string; brandId?: string }) {
    const row = (await this.database.update(products).set({ categoryId: input.categoryId, subcategoryId: input.subcategoryId ?? null, brandId: input.brandId ?? null, isPublished: false, updatedAt: new Date() }).where(and(eq(products.id, input.productId), eq(products.sellerId, input.sellerId))).returning({ id: products.id, sellerId: products.sellerId, name: products.name, brand: products.brand, stock: products.stock, isPublished: products.isPublished, categoryId: products.categoryId, subcategoryId: products.subcategoryId, brandId: products.brandId }))[0];
    return row ? { id: row.id, sellerId: row.sellerId!, name: row.name, ...(row.brand ? { brand: row.brand } : {}), stock: row.stock, isPublished: row.isPublished, categoryId: row.categoryId, subcategoryId: row.subcategoryId, brandId: row.brandId } : null;
  }
  async createProposal(input: { sellerId: string; kind: TaxonomyKind; name: string; slug: string; categoryId?: string }) { return proposal((await this.database.insert(taxonomyProposals).values(input).returning())[0]); }
  async listSellerProposals(sellerId: string) { return (await this.database.select().from(taxonomyProposals).where(eq(taxonomyProposals.sellerId, sellerId)).orderBy(desc(taxonomyProposals.createdAt))).map(proposal); }
  async listProposals(status?: TaxonomyProposal["status"]) { return (await this.database.select().from(taxonomyProposals).where(status ? eq(taxonomyProposals.status, status) : undefined).orderBy(desc(taxonomyProposals.createdAt))).map(proposal); }
  async withdrawProposal(input: { sellerId: string; proposalId: string }) { return (await this.database.update(taxonomyProposals).set({ status: "withdrawn", updatedAt: new Date() }).where(and(eq(taxonomyProposals.id, input.proposalId), eq(taxonomyProposals.sellerId, input.sellerId), eq(taxonomyProposals.status, "pending"))).returning({ id: taxonomyProposals.id })).length === 1; }
  async findProposal(proposalId: string) { const row = (await this.database.select().from(taxonomyProposals).where(eq(taxonomyProposals.id, proposalId)).limit(1))[0]; return row ? proposal(row) : null; }
  async reviewProposal(input: { proposalId: string; status: "approved" | "rejected"; canonicalId?: string; reviewNote?: string; reviewedById: string; activeCategoryId?: string }) {
    if (input.activeCategoryId) await this.lockCategory(input.activeCategoryId);
    const activeParent = input.activeCategoryId ? exists(this.database.select({ id: categories.id }).from(categories).where(and(eq(categories.id, input.activeCategoryId), eq(categories.isActive, true)))) : undefined;
    return (await this.database.update(taxonomyProposals).set({ status: input.status, canonicalId: input.canonicalId ?? null, reviewNote: input.reviewNote ?? null, reviewedById: input.reviewedById, reviewedAt: new Date(), updatedAt: new Date() }).where(and(eq(taxonomyProposals.id, input.proposalId), eq(taxonomyProposals.status, "pending"), activeParent)).returning({ id: taxonomyProposals.id })).length === 1;
  }
  private async lockCategory(categoryId: string) { await this.database.execute(sql`select pg_advisory_xact_lock(hashtext(${`taxonomy-category:${categoryId}`}))`); }
  private async lockCategories(categoryIds: (string | undefined)[]) { for (const categoryId of [...new Set(categoryIds.filter((categoryId): categoryId is string => Boolean(categoryId)))].sort()) await this.lockCategory(categoryId); }
}
