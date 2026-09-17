import type { SellerProfile, SellerProfileStatus } from "../seller/seller-profile.repository.js";
import type { AuditDatabase } from "../audit/audit.repository.js";

export type SellerTransitionAction = "approve" | "reject" | "suspend" | "activate";
export type SellerTransitionResult =
  | { kind: "updated"; seller: SellerProfile }
  | { kind: "not_found" }
  | { kind: "invalid_state" };
export type AdminSellerRepository = {
  withTransaction<T>(work: (repository: AdminSellerRepository, database: AuditDatabase) => Promise<T>): Promise<T>;
  list(): Promise<SellerProfile[]>;
  transition(input: { sellerProfileId: string; expectedStatuses: SellerProfileStatus[]; nextStatus: SellerProfileStatus; sellerRole: "customer" | "seller" }): Promise<SellerTransitionResult>;
};
