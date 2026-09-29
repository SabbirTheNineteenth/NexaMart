import type { Role } from "../auth/auth.types.js";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  sellerProfile: { storeName: string; status: "pending" | "approved" | "rejected" | "suspended" | "active" } | null;
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
  moderationStatus: "draft" | "pending_review" | "approved" | "rejected" | "changes_requested";
  moderationReason: string | null;
  moderationRevision: number;
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
export type AdminOrder = { id: string; reference: string; customer: { id: string; name: string }; total: number; status: "pending" | "confirmed" | "cancelled"; paymentStatus: "unpaid" | "collected"; itemCount: number; createdAt: string };
export type AdminSearchResult =
  | { type: "seller"; id: string; name: string; storeName: string; status: "pending" | "approved" | "rejected" | "suspended" | "active" }
  | { type: "product"; id: string; name: string; slug: string; isPublished: boolean }
  | { type: "order"; id: string; reference: string; status: "pending" | "confirmed" | "cancelled"; customerName: string };
export type AdminRepository = { listAccounts(limit: number): Promise<AdminAccount[]>; listProducts(): Promise<AdminProduct[]>; listOrders(): Promise<AdminOrder[]>; search(input: { query: string; limit: number }): Promise<AdminSearchResult[]> };
