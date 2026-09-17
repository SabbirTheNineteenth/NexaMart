import { ApiError } from "@/lib/api";

export function wishlistSaveError(reason: unknown): string {
  if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) return "Sign in from Account to save pieces.";
  return reason instanceof Error ? reason.message : "Unable to save this piece. Try again.";
}
