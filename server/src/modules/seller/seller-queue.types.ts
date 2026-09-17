export type SellerQueueOverview = {
  pendingFulfillmentLines: number;
  unreadNotifications: number;
  productsNeedingReview: number;
  outOfStockProducts: number;
};

export type SellerQueueRepository = {
  overview(sellerId: string): Promise<SellerQueueOverview>;
};
