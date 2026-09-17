import { asc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { categories } from "../../db/schema/index.js";
import type { TransactionalDatabase } from "../audit/audit.repository.js";
import type { AdminCategory, AdminCategoryInput, AdminCategoryRepository, AdminCategoryUpdate } from "./admin-category.repository.js";

const toCategory = (category: { id: string; name: string; slug: string; createdAt: Date }): AdminCategory => ({ ...category, createdAt: category.createdAt.toISOString() });

export class PostgresAdminCategoryRepository implements AdminCategoryRepository {
  constructor(private readonly database: TransactionalDatabase = db) {}

  async withTransaction<T>(work: (repository: AdminCategoryRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T> {
    if (!this.database.transaction) throw new Error("Transaction support is required for audited mutations");
    return this.database.transaction(async (transaction) => work(new PostgresAdminCategoryRepository(transaction), transaction));
  }

  async list(): Promise<AdminCategory[]> {
    return (await this.database.select().from(categories).orderBy(asc(categories.name))).map(toCategory);
  }

  async findBySlug(slug: string): Promise<{ id: string } | null> {
    return (await this.database.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1))[0] ?? null;
  }

  async create(input: AdminCategoryInput): Promise<AdminCategory> {
    const category = (await this.database.insert(categories).values(input).returning())[0];
    return toCategory(category);
  }

  async update({ id, ...input }: AdminCategoryUpdate): Promise<AdminCategory | null> {
    const category = (await this.database.update(categories).set(input).where(eq(categories.id, id)).returning())[0];
    return category ? toCategory(category) : null;
  }
}
