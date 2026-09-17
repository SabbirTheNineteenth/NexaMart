import type { AdminSeller, AdminSellerAction, AdminSellerStatus } from "@/types/admin";

const actionsByStatus: Record<AdminSellerStatus, AdminSellerAction[]> = {
  pending: ["approve", "reject"],
  approved: ["activate"],
  active: ["suspend"],
  suspended: ["activate"],
  rejected: ["activate"],
};

export function replaceModeratedSeller(sellers: AdminSeller[], seller: AdminSeller): AdminSeller[] {
  return sellers.map((current) => current.id === seller.id ? seller : current);
}

export function sellerModerationActions(status: AdminSellerStatus): AdminSellerAction[] {
  return actionsByStatus[status];
}

export function sellerModerationError(reason: unknown): string {
  if (reason instanceof DOMException && reason.name === "AbortError") return "";
  if (typeof reason === "object" && reason !== null && "status" in reason && reason.status === 404) return "Seller application was not found or is no longer available.";
  return reason instanceof Error ? reason.message : "Unable to update seller application.";
}
