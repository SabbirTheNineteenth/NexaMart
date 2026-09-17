import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { auditRecords } from "../../db/schema/index.js";
import type { AuditDatabase, AuditListFilters, AuditRecord, AuditRecordInput, AuditRepository } from "./audit.repository.js";

const toAuditRecord = (row: typeof auditRecords.$inferSelect): AuditRecord => ({
  id: row.id,
  actorId: row.actorId,
  action: row.action,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  metadata: row.metadata,
  createdAt: row.createdAt,
});

export class PostgresAuditRepository implements AuditRepository {
  async append(input: AuditRecordInput, database?: AuditDatabase) {
    const [record] = database
      ? await database.insert(auditRecords).values(input).returning()
      : await db.insert(auditRecords).values(input).returning();
    return toAuditRecord(record);
  }

  async list(filters: AuditListFilters) {
    const conditions = and(
      filters.action ? eq(auditRecords.action, filters.action) : undefined,
      filters.resourceType ? eq(auditRecords.resourceType, filters.resourceType) : undefined,
    );
    const rows = await db.select().from(auditRecords).where(conditions).orderBy(desc(auditRecords.createdAt)).limit(filters.limit);
    return rows.map(toAuditRecord);
  }
}
