import type { AdminOrderItem } from "@/types/admin";

export const codOrderStatusLabel = (status: "pending" | "confirmed" | "cancelled") => ({
  pending: "Awaiting Admin approval",
  confirmed: "Approved for delivery",
  cancelled: "Rejected / cancelled",
})[status];

export const nextCodDeliveryActions = (status: AdminOrderItem["fulfillmentStatus"]) => ({
  pending: ["processing"], processing: ["packed"], packed: ["shipped"],
  shipped: ["delivered", "failed_delivery"], delivered: [],
  failed_delivery: ["return_requested"], return_requested: ["returned"], returned: [], cancelled: [],
} as const)[status];
