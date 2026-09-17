export type SellerProductInput = { sellerId: string; name: string; brand?: string; slug: string; description: string; primaryImageUrl: string; price: number; stock: number; colors: string[] };
export type SellerProductSummary = { id: string; sellerId: string; name: string; brand?: string; stock: number; isPublished: boolean; moderationStatus: "draft" | "pending_review" | "approved" | "rejected" | "changes_requested"; moderationReason: string | null };
export type SellerProductUpdateInput = {
  sellerId: string;
  productId: string;
  name?: string;
  brand?: string;
  slug?: string;
  description?: string;
  price?: number;
  primaryImageUrl?: string;
  colors?: string[];
};
export type SellerProductDetail = { id: string; name: string; brand?: string; slug: string; description: string; price: number; categoryId: string | null; primaryImageUrl: string; colors: string[] };
export type SellerProductSubmission = { id: string; isPublished: boolean; moderationStatus: "pending_review"; moderationReason: null };
export type SellerProductSubmissionResult = { kind: "submitted"; product: SellerProductSubmission } | { kind: "not_found" } | { kind: "invalid_state" };
export type SellerProductVariantInput = { sellerId: string; productId: string; sku: string; options: Record<string, string>; price: number; stock: number };
export type SellerGalleryImageInput = { sellerId: string; productId: string; imageUrl: string; altText?: string; sortOrder: number };
export type SellerProductVariantUpdateInput = { sellerId: string; productId: string; variantId: string; sku?: string; options?: Record<string, string>; price?: number; stock?: number };
export type SellerGalleryImageUpdateInput = { sellerId: string; productId: string; imageId: string; imageUrl?: string; altText?: string; sortOrder?: number };
export type SellerProductArchiveInput = { sellerId: string; productId: string };
export type SellerProductVariantDeleteInput = { sellerId: string; productId: string; variantId: string };
export type SellerGalleryImageDeleteInput = { sellerId: string; productId: string; imageId: string };
export type SellerProductVariant = { id: string; sku: string; options: Record<string, string>; price: string; stock: number };
export type SellerGalleryImage = { id: string; imageUrl: string; altText?: string; sortOrder: number };

export type SellerCatalogRepository = {
  listProducts(sellerId: string): Promise<SellerProductSummary[]>;
  createProduct(input: SellerProductInput): Promise<{ id: string } & SellerProductInput>;
  updateProduct(input: SellerProductUpdateInput): Promise<SellerProductDetail | null>;
  archiveProduct(input: SellerProductArchiveInput): Promise<boolean>;
  submitForReview(input: { sellerId: string; productId: string }): Promise<SellerProductSubmissionResult>;
  updateStock(input: { sellerId: string; productId: string; stock: number }): Promise<boolean>;

  createVariant(input: SellerProductVariantInput): Promise<SellerProductVariant | null>;
  listVariants(input: { sellerId: string; productId: string }): Promise<SellerProductVariant[] | null>;
  updateVariant(input: SellerProductVariantUpdateInput): Promise<SellerProductVariant | null>;
  deleteVariant(input: SellerProductVariantDeleteInput): Promise<boolean>;
  createGalleryImage(input: SellerGalleryImageInput): Promise<SellerGalleryImage | null>;
  listGalleryImages(input: { sellerId: string; productId: string }): Promise<SellerGalleryImage[] | null>;
  updateGalleryImage(input: SellerGalleryImageUpdateInput): Promise<SellerGalleryImage | null>;
  deleteGalleryImage(input: SellerGalleryImageDeleteInput): Promise<boolean>;
};
