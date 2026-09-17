import { ne, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { accounts, categories, commissionRecords, orderItems, orders, productReviews, products, sellerProfiles } from "../../db/schema/index.js";
import type { AdminAnalyticsOverview, AdminAnalyticsRepository } from "./admin-analytics.repository.js";

const zero = "0.00";

export class PostgresAdminAnalyticsRepository implements AdminAnalyticsRepository {
  async overview(): Promise<AdminAnalyticsOverview> {
    const [accountRows, sellerRows, categoryRows, catalogRows, orderRows, orderLineRows, reviewRows, commissionRows] = await Promise.all([
      db.select({
        total: sql<number>`count(*)::int`,
        customers: sql<number>`count(*) filter (where ${accounts.role} = 'customer')::int`,
        sellers: sql<number>`count(*) filter (where ${accounts.role} = 'seller')::int`,
        admins: sql<number>`count(*) filter (where ${accounts.role} = 'admin')::int`,
      }).from(accounts),
      db.select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where ${sellerProfiles.status} = 'pending')::int`,
        approved: sql<number>`count(*) filter (where ${sellerProfiles.status} = 'approved')::int`,
        rejected: sql<number>`count(*) filter (where ${sellerProfiles.status} = 'rejected')::int`,
        suspended: sql<number>`count(*) filter (where ${sellerProfiles.status} = 'suspended')::int`,
        active: sql<number>`count(*) filter (where ${sellerProfiles.status} = 'active')::int`,
      }).from(sellerProfiles),
      db.select({ categories: sql<number>`count(*)::int` }).from(categories),
      db.select({
        products: sql<number>`count(*)::int`,
        publishedProducts: sql<number>`count(*) filter (where ${products.isPublished})::int`,
        draftProducts: sql<number>`count(*) filter (where not ${products.isPublished})::int`,
        totalStock: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
        outOfStockProducts: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
      }).from(products),
      db.select({
        orders: sql<number>`count(*)::int`,
        grossOrderTotal: sql<string>`coalesce(sum(${orders.total}), 0)`,
      }).from(orders),
      db.select({
        orderLines: sql<number>`count(*)::int`,
        unitsOrdered: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        pending: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'pending')::int`,
        processing: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'processing')::int`,
        shipped: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'shipped')::int`,
        delivered: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'delivered')::int`,
        cancelled: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'cancelled')::int`,
        returned: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'returned')::int`,
      }).from(orderItems),
      db.select({
        total: sql<number>`count(*)::int`,
        visible: sql<number>`count(*) filter (where ${productReviews.isVisible})::int`,
        hidden: sql<number>`count(*) filter (where not ${productReviews.isVisible})::int`,
      }).from(productReviews),
      db.select({
        records: sql<number>`count(*)::int`,
        grossAmount: sql<string>`coalesce(sum(${commissionRecords.grossAmount}), 0)`,
        commissionAmount: sql<string>`coalesce(sum(${commissionRecords.commissionAmount}), 0)`,
        netAmount: sql<string>`coalesce(sum(${commissionRecords.netAmount}), 0)`,
        accrued: sql<number>`count(*) filter (where ${commissionRecords.status} = 'accrued')::int`,
        eligible: sql<number>`count(*) filter (where ${commissionRecords.status} = 'eligible')::int`,
        paid: sql<number>`count(*) filter (where ${commissionRecords.status} = 'paid')::int`,
      }).from(commissionRecords).where(ne(commissionRecords.status, "void")),
    ]);
    const account = accountRows[0];
    const seller = sellerRows[0];
    const category = categoryRows[0];
    const catalog = catalogRows[0];
    const order = orderRows[0];
    const orderLine = orderLineRows[0];
    const review = reviewRows[0];
    const commission = commissionRows[0];

    return {
      bounds: { accounts: "all_time", sellers: "all_time", catalog: "current", orders: "all_time", reviews: "all_time", commissions: "all_time" },
      accounts: { total: account?.total ?? 0, customers: account?.customers ?? 0, sellers: account?.sellers ?? 0, admins: account?.admins ?? 0 },
      sellers: { total: seller?.total ?? 0, pending: seller?.pending ?? 0, approved: seller?.approved ?? 0, rejected: seller?.rejected ?? 0, suspended: seller?.suspended ?? 0, active: seller?.active ?? 0 },
      catalog: { categories: category?.categories ?? 0, products: catalog?.products ?? 0, publishedProducts: catalog?.publishedProducts ?? 0, draftProducts: catalog?.draftProducts ?? 0, totalStock: catalog?.totalStock ?? 0, outOfStockProducts: catalog?.outOfStockProducts ?? 0 },
      orders: { orders: order?.orders ?? 0, grossOrderTotal: order?.grossOrderTotal ?? zero, orderLines: orderLine?.orderLines ?? 0, unitsOrdered: orderLine?.unitsOrdered ?? 0, fulfillment: { pending: orderLine?.pending ?? 0, processing: orderLine?.processing ?? 0, shipped: orderLine?.shipped ?? 0, delivered: orderLine?.delivered ?? 0, cancelled: orderLine?.cancelled ?? 0, returned: orderLine?.returned ?? 0 } },
      reviews: { total: review?.total ?? 0, visible: review?.visible ?? 0, hidden: review?.hidden ?? 0 },
      commissions: { records: commission?.records ?? 0, grossAmount: commission?.grossAmount ?? zero, commissionAmount: commission?.commissionAmount ?? zero, netAmount: commission?.netAmount ?? zero, accrued: commission?.accrued ?? 0, eligible: commission?.eligible ?? 0, paid: commission?.paid ?? 0 },
    };
  }
}
