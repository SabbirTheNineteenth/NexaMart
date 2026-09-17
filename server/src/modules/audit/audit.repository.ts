import type { db } from "../../db/client.js";

export type AuditMetadata = Record<string, unknown>;
export type AuditDatabase = Pick<typeof db, "insert">;
export type TransactionalDatabase = Pick<typeof db, "select" | "insert" | "update" | "delete"> & Partial<Pick<typeof db, "transaction">>;

export type AuditRecordInput = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: AuditMetadata;
};

export type AuditRecord = AuditRecordInput & {
  id: string;
  createdAt: Date;
};

export type AuditListFilters = {
  action?: string;
  resourceType?: string;
  limit: number;
};

export type AuditRepository = {
  append(input: AuditRecordInput, database?: AuditDatabase): Promise<AuditRecord>;
  list(filters: AuditListFilters): Promise<AuditRecord[]>;
};
