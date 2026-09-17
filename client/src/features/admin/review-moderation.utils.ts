import type { AdminReview } from "@/types/admin";

export function applyReviewVisibility(reviews: AdminReview[], reviewId: string, isVisible: boolean): AdminReview[] {
  return reviews.map((review) => review.id === reviewId ? { ...review, isVisible } : review);
}

export function reviewModerationError(reason: unknown): string {
  if (reason instanceof DOMException && reason.name === "AbortError") return "";
  return reason instanceof Error ? reason.message : "Unable to update review visibility. Please try again.";
}
