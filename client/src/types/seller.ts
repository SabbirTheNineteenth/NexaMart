import type { FulfillmentStatus } from "@/types/account";

export type SellerProduct = {
  id: string;
  sellerId: string;
  name: string;
  brand?: string;
  stock: number;
  isPublished: boolean;
  moderationStatus?: "draft" | "pending_review" | "approved" | "rejected" | "changes_requested";
  moderationReason?: string | null;
} & Partial<SellerProductDetail>;

export type SellerProductDetail = {
  id: string;
  name: string;
  brand?: string;
  slug: string;
  description: string;
  price: number;
  categoryId: string | null;
  subcategoryId?: string | null;
  brandId?: string | null;
  primaryImageUrl: string;
  colors: string[];
};

export type SellerTaxonomyNode = { id: string; name: string; slug: string };
export type SellerTaxonomySubcategory = SellerTaxonomyNode & { categoryId: string };
export type SellerTaxonomyOptions = { categories: SellerTaxonomyNode[]; subcategories: SellerTaxonomySubcategory[]; brands: SellerTaxonomyNode[] };
export type SellerTaxonomyKind = "category" | "subcategory" | "brand";
export type SellerTaxonomyProposal = {
  id: string;
  sellerId: string;
  kind: SellerTaxonomyKind;
  name: string;
  slug: string;
  categoryId: string | null;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  canonicalId?: string | null;
  reviewNote?: string | null;
  createdAt?: string;
};

export type SellerStoreProfile = {
  id: string;
  storeName: string;
  description?: string;
};

export type SellerProductVariant = {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: string;
  stock: number;
};

export type SellerGalleryImage = {
  id: string;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
};

export type SellerPromotion = {
  id: string;
  sellerId: string;
  name: string;
  scope: "product";
  productId: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SellerOrder = {
  id: string;
  reference: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  items: { id: string; productName: string; quantity: number; fulfillmentStatus: FulfillmentStatus }[];
};

export type SellerReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVisible: boolean;
  createdAt: string;
  product: { id: string; name: string };
};

export type SellerFinance = {
  summary: {
    accruedNetAmount: string;
    eligibleNetAmount: string;
    payableAmount: string;
    heldPayoutAmount: string;
  };
  commissions: SellerCommission[];
  payouts: SellerPayout[];
};
export type SellerPayout = { id: string; reference: string; amount: string; status: "pending" | "approved" | "rejected"; createdAt: string };

export type SellerCommission = {
  id: string;
  orderReference: string;
  orderItemId: string;
  grossAmount: string;
  ratePercent: string;
  commissionAmount: string;
  netAmount: string;
  status: string;
  createdAt: string;
};

export type SellerAnalytics = {
  catalog: {
    scope: "current";
    total: number;
    published: number;
    draft: number;
    stock: number;
    outOfStock: number;
  };
  orders: {
    scope: "all_time";
    orderLineCount: number;
    unitsSold: number;
    grossSales: string;
    fulfillmentStatusCounts: Record<FulfillmentStatus, number>;
  };
};

export type SellerNotification = {
  id: string;
  type: "product_moderation_decision" | "order_line_created";
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
