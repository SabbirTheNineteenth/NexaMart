import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { orderItems, products } from "../../db/schema/index.js";

const zero = "0.00";

export class PostgresSellerAnalyticsRepository {
  async overview(sellerId: string) {
    const [catalogRows, orderRows] = await Promise.all([
      db.select({
        productCount: sql<number>`count(*)::int`,
        publishedProductCount: sql<number>`count(*) filter (where ${products.isPublished})::int`,
        draftProductCount: sql<number>`count(*) filter (where not ${products.isPublished})::int`,
        totalStock: sql<number>`coalesce(sum(${products.stock}), 0)::int`,
        outOfStockProductCount: sql<number>`count(*) filter (where ${products.stock} = 0)::int`,
      }).from(products).where(eq(products.sellerId, sellerId)),
      db.select({
        orderLineCount: sql<number>`count(*)::int`,
        unitsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        grossSalesAmount: sql<string>`coalesce(sum(${orderItems.unitPrice} * ${orderItems.quantity}), 0)`,
        pending: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'pending')::int`,
        processing: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'processing')::int`,
        packed: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'packed')::int`,
        shipped: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'shipped')::int`,
        delivered: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'delivered')::int`,
        cancelled: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'cancelled')::int`,
        returned: sql<number>`count(*) filter (where ${orderItems.fulfillmentStatus} = 'returned')::int`,
      }).from(orderItems).where(eq(orderItems.sellerId, sellerId)),
    ]);
    const catalog = catalogRows[0];
    const orders = orderRows[0];
    return {
      bounds: { catalog: "current", orders: "all_time" },
      catalog: {
        productCount: catalog?.productCount ?? 0,
        publishedProductCount: catalog?.publishedProductCount ?? 0,
        draftProductCount: catalog?.draftProductCount ?? 0,
        totalStock: catalog?.totalStock ?? 0,
        outOfStockProductCount: catalog?.outOfStockProductCount ?? 0,
      },
      orders: {
        orderLineCount: orders?.orderLineCount ?? 0,
        unitsSold: orders?.unitsSold ?? 0,
        grossSalesAmount: orders?.grossSalesAmount ?? zero,
        fulfillment: {
          pending: orders?.pending ?? 0,
          processing: orders?.processing ?? 0,
          packed: orders?.packed ?? 0,
          shipped: orders?.shipped ?? 0,
          delivered: orders?.delivered ?? 0,
          cancelled: orders?.cancelled ?? 0,
          returned: orders?.returned ?? 0,
        },
      },
    };
  }
}
