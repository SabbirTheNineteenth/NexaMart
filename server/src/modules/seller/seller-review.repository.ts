export type SellerReview = {
  id: string;
  product: { id: string; name: string };
  rating: number;
  title?: string;
  body?: string;
  createdAt: string;
  isVisible: boolean;
};

export type SellerReviewRepository = {
  listForSeller(sellerId: string): Promise<SellerReview[]>;
};
