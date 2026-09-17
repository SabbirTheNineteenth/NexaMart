import type { AuditDatabase } from "../audit/audit.repository.js";

export type AdminReview = {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title?: string;
  body?: string;
  isVisible: boolean;
  createdAt: string;
};

export type AdminReviewRepository = {
  withTransaction<T>(work: (repository: AdminReviewRepository, database: AuditDatabase) => Promise<T>): Promise<T>;
  list(): Promise<AdminReview[]>;
  setVisibility(input: { reviewId: string; isVisible: boolean }): Promise<AdminReview | null>;
};
