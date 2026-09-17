import { ApiError } from "@/lib/api";

export function cartAddError(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 401 || reason.status === 403) return "Sign in from Account to add items to your bag.";
    if (reason.status === 409 || reason.status === 422) return "This item is no longer available in the requested quantity.";
  }
  return reason instanceof Error ? reason.message : "Unable to add this item to your bag. Try again.";
}
