import type { AdminFinanceOverview } from "./admin-finance.routes.js";

export type AdminFinanceRepository = {
  overview(): Promise<AdminFinanceOverview>;
  withTransaction?<T>(work: (repository: AdminFinanceRepository, database: import("../audit/audit.repository.js").AuditDatabase) => Promise<T>): Promise<T>;
  reviewPayout?(input: { payoutId: string; expectedStatus: "pending"; status: "approved" | "rejected"; reviewedById: string }): Promise<{ kind: "updated"; payout: { id: string; status: "pending" | "approved" | "rejected" | "paid" } } | { kind: "invalid_state" } | { kind: "not_found" }>;
};
