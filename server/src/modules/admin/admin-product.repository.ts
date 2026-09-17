import type { AdminProduct } from "./admin.types.js";
import type { AuditDatabase } from "../audit/audit.repository.js";

export type PublicationResult = { kind: "updated"; product: AdminProduct } | { kind: "not_found" } | { kind: "stale" } | { kind: "ineligible" };
export type ModerationStatus = "approved" | "rejected" | "changes_requested";
export type ModerationResult = { kind: "updated"; product: AdminProduct } | { kind: "not_found" } | { kind: "stale" };

export type AdminProductRepository = {
  withTransaction<T>(work: (repository: AdminProductRepository, database: AuditDatabase) => Promise<T>): Promise<T>;
  setPublication(input: { productId: string; isPublished: boolean; expectedRevision: string }): Promise<PublicationResult>;
  moderate(input: { productId: string; status: ModerationStatus; reason?: string; expectedRevision: string; adminId: string }): Promise<ModerationResult>;
};
