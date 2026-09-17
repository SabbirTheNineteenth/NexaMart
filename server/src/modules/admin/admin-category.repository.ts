import type { AuditDatabase } from "../audit/audit.repository.js";

export type AdminCategory = { id: string; name: string; slug: string; createdAt: string };
export type AdminCategoryInput = { name: string; slug: string };
export type AdminCategoryUpdate = { id: string } & Partial<AdminCategoryInput>;
export type AdminCategoryCreateCommand = AdminCategoryInput & { adminId: string };
export type AdminCategoryUpdateCommand = AdminCategoryUpdate & { adminId: string };

export class CategoryConflictError extends Error {
  constructor() {
    super("Category slug already exists");
  }
}

export type AdminCategoryRepository = {
  list(): Promise<AdminCategory[]>;
  findBySlug(slug: string): Promise<{ id: string } | null>;
  create(input: AdminCategoryInput): Promise<AdminCategory>;
  update(input: AdminCategoryUpdate): Promise<AdminCategory | null>;
  withTransaction<T>(work: (repository: AdminCategoryRepository, database: AuditDatabase) => Promise<T>): Promise<T>;
};
