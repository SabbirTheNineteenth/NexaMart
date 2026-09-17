import type { FulfillmentStatus } from "@/types/account";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "seller" | "admin";
  createdAt: string;
  seller?: { storeName: string; status: AdminSellerStatus } | null;
};
export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  primaryImageUrl: string;
  price: number;
  stock: number;
  isPublished: boolean;
  moderationStatus?: "draft" | "pending_review" | "approved" | "rejected" | "changes_requested";
  moderationReason?: string | null;
  moderationRevision?: number;
  description?: string;
  colors?: string[];
  galleryImages?: { imageUrl: string; altText: string | null; sortOrder: number }[];
  variants?: { sku: string; options: Record<string, string>; price: number; stock: number }[];
  category: { id: string; name: string; slug: string } | null;
  seller: { id: string; name: string; storeName?: string; storeSlug?: string; status?: "pending" | "approved" | "rejected" | "suspended" | "active" } | null;
  createdAt: string;
  updatedAt: string;
  expectedRevision: string;
};
export type AdminOrderItem = {
  id: string;
  seller: { id: string | null; name: string | null };
  product: { id: string | null; name: string; imageUrl: string | null };
  variant?: { sku: string; options: Record<string, string> };
  quantity: number;
  unitPrice: number;
  fulfillmentStatus: FulfillmentStatus;
};
export type AdminOrder = {
  id: string;
  reference: string;
  customer: { id: string; name: string };
  total: number;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "unpaid";
  items: AdminOrderItem[];
  createdAt: string;
};
export type AdminReview = { id: string; rating: number; title: string | null; body: string | null; isVisible: boolean; createdAt: string; customer: { id: string; name: string }; product: { id: string; name: string } };
export type AdminAuditRecord = { id: string; actorId: string; action: string; resourceType: string; resourceId: string; metadata: Record<string, unknown>; createdAt: string };
export type AdminPromotion = {
  id: string;
  name: string;
  scope: "product" | "order";
  product: { id: string | null; name: string | null; imageUrl: string | null };
  seller: { id: string; name: string };
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
};
export type AdminCategory = { id: string; name: string; slug: string; createdAt: string };
export type AdminTaxonomyKind = "category" | "subcategory" | "brand";
export type AdminTaxonomyNode = { id: string; name: string; slug: string; isActive: boolean; categoryId?: string };
export type AdminTaxonomyPayload = { categories: AdminTaxonomyNode[]; subcategories: AdminTaxonomyNode[]; brands: AdminTaxonomyNode[] };
export type AdminTaxonomyProposal = { id: string; sellerId: string; kind: AdminTaxonomyKind; name: string; slug: string; categoryId: string | null; status: "pending" | "approved" | "rejected" | "withdrawn"; canonicalId?: string | null; reviewNote?: string | null; createdAt?: string };
export type AdminSellerStatus = "pending" | "approved" | "rejected" | "suspended" | "active";
export type AdminSellerAction = "approve" | "reject" | "suspend" | "activate";
export type AdminSeller = { id: string; accountId: string; storeName: string; storeSlug: string; description?: string; status: AdminSellerStatus; createdAt: string };
export type AdminSearchResult =
  | { type: "seller"; id: string; name: string; storeName: string; status: AdminSellerStatus }
  | { type: "product"; id: string; name: string; slug: string; isPublished: boolean }
  | { type: "order"; id: string; reference: string; status: "pending" | "confirmed" | "cancelled"; customerName: string };
export type AdminDashboardData = { accounts: AdminAccount[]; products: AdminProduct[]; orders: AdminOrder[]; promotions: AdminPromotion[]; reviews: AdminReview[]; auditRecords: AdminAuditRecord[] };
export type AdminFinanceCommission = { id: string; sellerId: string; orderReference: string; orderItemId: string; grossAmount: string; ratePercent: string; commissionAmount: string; netAmount: string; status: "accrued" | "eligible" | "paid"; createdAt: string };
export type AdminFinanceOverview = {
  summary: {
    grossAmount: string;
    commissionAmount: string;
    netAmount: string;
    accruedNetAmount: string;
    eligibleNetAmount: string;
    paidNetAmount: string;
    pendingPayoutAmount: string;
  };
  commissions: AdminFinanceCommission[];
  payouts: AdminFinancePayout[];
};
export type AdminFinancePayout = { id: string; sellerId: string; reference: string; amount: string; status: "pending" | "approved" | "rejected" | "paid"; createdAt: string };

export type AdminAnalytics = {
  bounds: {
    accounts: "all_time";
    sellers: "all_time";
    catalog: "current";
    orders: "all_time";
    reviews: "all_time";
    commissions: "all_time";
  };
  accounts: { total: number; customers: number; sellers: number; admins: number };
  sellers: { total: number; pending: number; approved: number; rejected: number; suspended: number; active: number };
  catalog: { categories: number; products: number; publishedProducts: number; draftProducts: number; totalStock: number; outOfStockProducts: number };
  orders: { orders: number; grossOrderTotal: string; orderLines: number; unitsOrdered: number; fulfillment: Record<FulfillmentStatus, number> };
  reviews: { total: number; visible: number; hidden: number };
  commissions: { records: number; grossAmount: string; commissionAmount: string; netAmount: string; accrued: number; eligible: number; paid: number };
};
