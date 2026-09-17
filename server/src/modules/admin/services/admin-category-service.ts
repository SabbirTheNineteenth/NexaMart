import type { AuditDatabase } from "../../audit/audit.repository.js";
import type { AdminCategory, AdminCategoryCreateCommand, AdminCategoryRepository, AdminCategoryUpdateCommand } from "../admin-category.repository.js";
import { CategoryConflictError } from "../admin-category.repository.js";

export class AdminCategoryService {
  constructor(
    private readonly categories: AdminCategoryRepository,
    private readonly audit: { record(input: { actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown> }, database?: AuditDatabase): Promise<unknown> },
  ) {}

  list(): Promise<AdminCategory[]> {
    return this.categories.list();
  }

  async create(input: AdminCategoryCreateCommand): Promise<AdminCategory> {
    this.requireMutationDependencies();
    return this.inTransaction(async (categories, database) => {
      if (await categories.findBySlug(input.slug)) throw new CategoryConflictError();
      try {
        const category = await categories.create({ name: input.name, slug: input.slug });
        await this.audit.record({ actorId: input.adminId, action: "category.created", resourceType: "category", resourceId: category.id, metadata: { name: category.name, slug: category.slug } }, database);
        return category;
      } catch (error) {
        if (isUniqueViolation(error)) throw new CategoryConflictError();
        throw error;
      }
    });
  }

  async update(input: AdminCategoryUpdateCommand): Promise<AdminCategory> {
    this.requireMutationDependencies();
    return this.inTransaction(async (categories, database) => {
      if (input.slug) {
        const existing = await categories.findBySlug(input.slug);
        if (existing && existing.id !== input.id) throw new CategoryConflictError();
      }
      try {
        const { adminId, ...update } = input;
        const category = await categories.update(update);
        if (!category) throw new Error("Category not found");
        await this.audit.record({ actorId: adminId, action: "category.updated", resourceType: "category", resourceId: category.id, metadata: { fields: Object.keys(update).filter((field) => field !== "id") } }, database);
        return category;
      } catch (error) {
        if (isUniqueViolation(error)) throw new CategoryConflictError();
        throw error;
      }
    });
  }

  private inTransaction<T>(work: (repository: AdminCategoryRepository, database: AuditDatabase) => Promise<T>): Promise<T> {
    return this.categories.withTransaction(work);
  }

  private requireMutationDependencies(): void {
    if (!this.audit) throw new Error("Audit dependency is required");
    if (!this.categories.withTransaction) throw new Error("Transaction support is required for audited mutations");
  }
}

const isUniqueViolation = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "23505";
