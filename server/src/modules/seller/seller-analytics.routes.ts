import { Hono } from "hono";
import { createAuthGuard, getAuthenticatedAccount } from "../auth/auth.guard.js";
import type { PublicAccount } from "../auth/auth.types.js";

type SessionResolver = { resolve(token: string): Promise<PublicAccount | null> };
type SellerAnalyticsOverview = {
  bounds: { catalog: "current"; orders: "all_time" };
  catalog: { productCount: number; publishedProductCount: number; draftProductCount: number; totalStock: number; outOfStockProductCount: number };
  orders: {
    orderLineCount: number;
    unitsSold: number;
    grossSalesAmount: string;
    fulfillment: { pending: number; processing: number; packed: number; shipped: number; delivered: number; cancelled: number; returned: number };
  };
};
type SellerAnalytics = { overview(sellerId: string): Promise<unknown> };

const toClientAnalytics = (overview: SellerAnalyticsOverview) => ({
  catalog: {
    scope: overview.bounds.catalog,
    total: overview.catalog.productCount,
    published: overview.catalog.publishedProductCount,
    draft: overview.catalog.draftProductCount,
    stock: overview.catalog.totalStock,
    outOfStock: overview.catalog.outOfStockProductCount,
  },
  orders: {
    scope: overview.bounds.orders,
    orderLineCount: overview.orders.orderLineCount,
    unitsSold: overview.orders.unitsSold,
    grossSales: overview.orders.grossSalesAmount,
    fulfillmentStatusCounts: overview.orders.fulfillment,
  },
});

export const createSellerAnalyticsRoutes = ({ sessions, analytics }: { sessions: SessionResolver; analytics: SellerAnalytics }) => {
  const routes = new Hono();
  const guard = createAuthGuard(sessions);
  routes.get("/analytics", guard.requireAccount, guard.requireRole("seller"), async (c) => {
    try {
      return c.json({ analytics: toClientAnalytics((await analytics.overview(getAuthenticatedAccount(c)!.id)) as SellerAnalyticsOverview) });
    } catch {
      return c.json({ error: "Unable to load seller analytics" }, 500);
    }
  });
  return routes;
};
