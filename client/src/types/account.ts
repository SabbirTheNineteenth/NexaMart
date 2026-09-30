export type Account = { id: string; name: string; email: string; role: "customer" | "seller" | "admin"; createdAt: string };
export type CustomerOrder = { id: string; reference: string; total: number; status: "pending" | "confirmed" | "cancelled"; paymentMethod?: "cod"; paymentStatus: "unpaid" | "collected"; createdAt: string; items: { productId: string; quantity: number; unitPrice: number }[] };
export type FulfillmentStatus = "pending" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
export type CustomerFulfillmentStatus = FulfillmentStatus | "failed_delivery" | "return_requested";
export type CustomerOrderTracking = {
  id: string;
  reference: string;
  status: CustomerOrder["status"];
  paymentMethod: CustomerOrder["paymentMethod"];
  paymentStatus: CustomerOrder["paymentStatus"];
  createdAt: string;
  items: { id: string; productName: string; productImageUrl: string | null; variantSku?: string | null; variantOptions?: Record<string, string> | null; quantity: number; unitPrice: number; fulfillmentStatus: CustomerFulfillmentStatus }[];
  events: { id: string; orderItemId: string | null; eventType: string; fromStatus: string | null; toStatus: string | null; note: string | null; createdAt: string }[];
};
export type CustomerReviewEligibility = { product: { id: string; name: string; image: string | null }; orderItem: { id: string }; order: { id: string; reference: string } };
export type WishlistItem = { id: string; name: string; price: number; image: string };
export type ShippingAddress = { id: string; recipientName: string; phone: string; line1: string; line2?: string; city: string; region?: string; postalCode?: string; country: string; isDefault: boolean };
