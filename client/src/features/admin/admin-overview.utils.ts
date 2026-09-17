import type { AdminDashboardData } from "@/types/admin";

type AdminOverviewData = Pick<AdminDashboardData, "accounts" | "products" | "orders">;

export function adminOverview({ accounts, products, orders }: AdminOverviewData) {
  return {
    accountCount: accounts.length,
    productCount: products.length,
    unpublishedProducts: products.filter((product) => !product.isPublished).length,
    outOfStockProducts: products.filter((product) => product.stock === 0).length,
    pendingOrders: orders.filter((order) => order.status === "pending").length,
    orderCount: orders.length,
  };
}
