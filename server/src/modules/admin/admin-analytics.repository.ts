export type AdminAnalyticsOverview = {
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
  orders: { orders: number; grossOrderTotal: string; orderLines: number; unitsOrdered: number; fulfillment: { pending: number; processing: number; shipped: number; delivered: number; cancelled: number; returned: number } };
  reviews: { total: number; visible: number; hidden: number };
  commissions: { records: number; grossAmount: string; commissionAmount: string; netAmount: string; accrued: number; eligible: number; paid: number };
};

export type AdminAnalyticsRepository = { overview(): Promise<AdminAnalyticsOverview> };
