import { Hono } from "hono";
import { cors } from "hono/cors";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { createOrderRoutes } from "./modules/orders/order.routes.js";
import { PostgresOrderRepository } from "./modules/orders/postgres-order.repository.js";
import { OrderService } from "./modules/orders/services/order-service.js";
import { createAuthRoutes } from "./modules/auth/auth.routes.js";
import { AuthService } from "./modules/auth/services/auth-service.js";
import { PostgresAuthRepository } from "./modules/auth/auth.repository.js";
import { SessionService } from "./modules/auth/services/session-service.js";
import { PostgresSessionRepository } from "./modules/auth/session.repository.js";
import { createAddressRoutes } from "./modules/addresses/address.routes.js";
import { PostgresAddressRepository } from "./modules/addresses/postgres-address.repository.js";
import { AddressService } from "./modules/addresses/services/address-service.js";
import { createCartRoutes } from "./modules/cart/cart.routes.js";
import { PostgresCartRepository } from "./modules/cart/postgres-cart.repository.js";
import { CartService } from "./modules/cart/services/cart-service.js";
import { createWishlistRoutes } from "./modules/wishlist/wishlist.routes.js";
import { PostgresWishlistRepository } from "./modules/wishlist/postgres-wishlist.repository.js";
import { WishlistService } from "./modules/wishlist/services/wishlist-service.js";
import { createReviewRoutes } from "./modules/reviews/review.routes.js";
import { ReviewService } from "./modules/reviews/services/review-service.js";
import { createSellerRoutes } from "./modules/seller/seller.routes.js";
import { createSellerAnalyticsRoutes } from "./modules/seller/seller-analytics.routes.js";
import { createSellerQueueRoutes } from "./modules/seller/seller-queue.routes.js";
import { createSellerReviewRoutes } from "./modules/seller/seller-review.routes.js";
import { createSellerFulfillmentRoutes } from "./modules/seller/seller-fulfillment.routes.js";
import { createSellerFinanceRoutes } from "./modules/seller/seller-finance.routes.js";
import { createSellerApplicationRoutes } from "./modules/seller/seller-application.routes.js";
import { PostgresSellerCatalogRepository } from "./modules/seller/postgres-seller-catalog.repository.js";
import { PostgresSellerAnalyticsRepository } from "./modules/seller/postgres-seller-analytics.repository.js";
import { PostgresSellerQueueRepository } from "./modules/seller/postgres-seller-queue.repository.js";
import { PostgresSellerReviewRepository } from "./modules/seller/postgres-seller-review.repository.js";
import { PostgresSellerProfileRepository } from "./modules/seller/postgres-seller-profile.repository.js";
import { SellerCatalogService } from "./modules/seller/services/seller-catalog-service.js";
import { SellerAnalyticsService } from "./modules/seller/services/seller-analytics-service.js";
import { SellerQueueService } from "./modules/seller/services/seller-queue-service.js";
import { SellerReviewService } from "./modules/seller/services/seller-review-service.js";
import { SellerFulfillmentService } from "./modules/seller/services/seller-fulfillment-service.js";
import { SellerFinanceService } from "./modules/seller/services/seller-finance-service.js";
import { SellerProfileService } from "./modules/seller/services/seller-profile-service.js";
import { createSellerPromotionRoutes } from "./modules/promotions/seller-promotion.routes.js";
import { PostgresSellerPromotionRepository } from "./modules/promotions/postgres-seller-promotion.repository.js";
import { SellerPromotionService } from "./modules/promotions/services/seller-promotion-service.js";
import { createAdminRoutes } from "./modules/admin/admin.routes.js";
import { createAdminAnalyticsRoutes } from "./modules/admin/admin-analytics.routes.js";
import { createAdminSellerRoutes } from "./modules/admin/admin-seller.routes.js";
import { createAdminReviewRoutes } from "./modules/admin/admin-review.routes.js";
import { createAdminFinanceRoutes } from "./modules/admin/admin-finance.routes.js";
import { createAdminCategoryRoutes } from "./modules/admin/admin-category.routes.js";
import { createAdminOrderRoutes } from "./modules/admin/admin-order.routes.js";
import { createAdminProductRoutes } from "./modules/admin/admin-product.routes.js";
import { createAdminPromotionRoutes } from "./modules/admin/admin-promotion.routes.js";
import { PostgresAdminRepository } from "./modules/admin/admin.repository.js";
import { PostgresAdminAnalyticsRepository } from "./modules/admin/postgres-admin-analytics.repository.js";
import { PostgresAdminSellerRepository } from "./modules/admin/postgres-admin-seller.repository.js";
import { PostgresAdminReviewRepository } from "./modules/admin/postgres-admin-review.repository.js";
import { PostgresAdminFinanceRepository } from "./modules/admin/postgres-admin-finance.repository.js";
import { PostgresAdminCategoryRepository } from "./modules/admin/postgres-admin-category.repository.js";
import { PostgresAdminOrderRepository } from "./modules/admin/postgres-admin-order.repository.js";
import { PostgresAdminProductRepository } from "./modules/admin/postgres-admin-product.repository.js";
import { PostgresAdminPromotionRepository } from "./modules/admin/postgres-admin-promotion.repository.js";
import { AdminDashboardService } from "./modules/admin/services/admin-dashboard-service.js";
import { AdminAnalyticsService } from "./modules/admin/services/admin-analytics-service.js";
import { AdminSellerService } from "./modules/admin/services/admin-seller-service.js";
import { AdminReviewService } from "./modules/admin/services/admin-review-service.js";
import { AdminFinanceService } from "./modules/admin/services/admin-finance-service.js";
import { AdminCategoryService } from "./modules/admin/services/admin-category-service.js";
import { AdminOrderService } from "./modules/admin/services/admin-order-service.js";
import { AdminProductService } from "./modules/admin/services/admin-product-service.js";
import { AdminPromotionService } from "./modules/admin/services/admin-promotion-service.js";
import { createAuditRoutes } from "./modules/audit/audit.routes.js";
import { PostgresAuditRepository } from "./modules/audit/postgres-audit.repository.js";
import { AuditService } from "./modules/audit/services/audit-service.js";
import { resolveClientOrigin } from "./config/environment.js";
import { isSharedAtomicAuthAdmissionLimiter, type AuthAdmissionConfiguration } from "./modules/auth/auth-admission.js";
import { createAdminTaxonomyRoutes } from "./modules/taxonomy/admin-taxonomy.routes.js";
import { createSellerTaxonomyRoutes } from "./modules/taxonomy/seller-taxonomy.routes.js";
import { PostgresTaxonomyRepository } from "./modules/taxonomy/postgres-taxonomy.repository.js";
import { TaxonomyService } from "./modules/taxonomy/services/taxonomy-service.js";
import { createSellerNotificationRoutes } from "./modules/notifications/seller-notification.routes.js";
import { PostgresSellerNotificationRepository } from "./modules/notifications/postgres-seller-notification.repository.js";

type Environment = Record<string, string | undefined>;

export type AppDependencies = {
  authAdmission?: AuthAdmissionConfiguration;
};

const unsafeMethods = new Set(["POST", "PATCH", "DELETE"]);

function hasSessionCookie(cookieHeader: string | undefined): boolean {
  return /(?:^|;\s*)nexamart_session=[^;]+(?:;|$)/.test(cookieHeader ?? "");
}

function isAllowedBrowserOrigin(origin: string | undefined, clientOrigin: string): boolean {
  if (!origin) return false;

  try {
    return new URL(origin).origin === clientOrigin;
  } catch {
    return false;
  }
}

function hasAllowedRequestSource(origin: string | undefined, referer: string | undefined, clientOrigin: string): boolean {
  return origin
    ? isAllowedBrowserOrigin(origin, clientOrigin)
    : isAllowedBrowserOrigin(referer, clientOrigin);
}

export function createApp(environment: Environment = process.env, dependencies: AppDependencies = {}) {
  const clientOrigin = resolveClientOrigin(environment);
  const authAdmission = { ...dependencies.authAdmission, environment };
  if (environment.NODE_ENV === "production" && !isSharedAtomicAuthAdmissionLimiter(authAdmission?.limiter)) {
    throw new Error("A shared-atomic AuthAdmissionLimiter must be injected in production");
  }
  const authService = new AuthService(new PostgresAuthRepository());
  const sessionService = new SessionService(new PostgresSessionRepository());
  const cartService = new CartService(new PostgresCartRepository());
  const wishlistService = new WishlistService(new PostgresWishlistRepository());
  const sellerNotifications = new PostgresSellerNotificationRepository();
  const orderService = new OrderService(new PostgresOrderRepository(sellerNotifications));
  const addressService = new AddressService(new PostgresAddressRepository());
  const reviewService = new ReviewService();
  const sellerAnalyticsService = new SellerAnalyticsService(new PostgresSellerAnalyticsRepository());
  const sellerQueueService = new SellerQueueService(new PostgresSellerQueueRepository());
  const sellerReviewService = new SellerReviewService(new PostgresSellerReviewRepository());
  const sellerFulfillmentService = new SellerFulfillmentService();
  const sellerProfileService = new SellerProfileService(new PostgresSellerProfileRepository());
  const auditService = new AuditService(new PostgresAuditRepository());
  const sellerFinanceService = new SellerFinanceService(auditService);
  const taxonomyService = new TaxonomyService(new PostgresTaxonomyRepository(), auditService);
  const sellerCatalogService = new SellerCatalogService(new PostgresSellerCatalogRepository(), taxonomyService);
  const sellerPromotionService = new SellerPromotionService(new PostgresSellerPromotionRepository(), auditService);
  const adminDashboardService = new AdminDashboardService(new PostgresAdminRepository());
  const adminAnalyticsService = new AdminAnalyticsService(new PostgresAdminAnalyticsRepository());
  const adminSellerService = new AdminSellerService(new PostgresAdminSellerRepository(), auditService);
  const adminReviewService = new AdminReviewService(new PostgresAdminReviewRepository(), auditService);
  const adminFinanceService = new AdminFinanceService(new PostgresAdminFinanceRepository(), auditService);
  const adminCategoryService = new AdminCategoryService(new PostgresAdminCategoryRepository(), auditService);
  const adminOrderService = new AdminOrderService(new PostgresAdminOrderRepository());
  const adminProductService = new AdminProductService(new PostgresAdminProductRepository(), auditService, sellerNotifications);
  const adminPromotionService = new AdminPromotionService(new PostgresAdminPromotionRepository());
  const app = new Hono().basePath("/api");

  app.use("*", async (c, next) => {
    c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    c.header("Referrer-Policy", "no-referrer");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    await next();
  });
  app.use("*", cors({ origin: clientOrigin, credentials: true, allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type", "Idempotency-Key"] }));
  app.use("*", async (c, next) => {
    if (
      unsafeMethods.has(c.req.method)
      && hasSessionCookie(c.req.header("cookie"))
      && !hasAllowedRequestSource(c.req.header("origin"), c.req.header("referer"), clientOrigin)
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await next();
  });
  app.get("/health", (c) => c.json({ ok: true, service: "nexamart" }));
  app.route("/catalog", catalogRoutes);
  app.route("/checkout", createOrderRoutes({ sessions: sessionService, orders: orderService }));
  app.route("/addresses", createAddressRoutes({ sessions: sessionService, addresses: addressService }));
  app.route("/reviews", createReviewRoutes({ sessions: sessionService, reviews: reviewService }));
  app.route("/cart", createCartRoutes({ sessions: sessionService, cart: cartService }));
  app.route("/wishlist", createWishlistRoutes({ sessions: sessionService, wishlist: wishlistService }));
  app.route("/seller", createSellerApplicationRoutes({ sessions: sessionService, sellerProfiles: sellerProfileService }));
  app.route("/seller", createSellerAnalyticsRoutes({ sessions: sessionService, analytics: sellerAnalyticsService }));
  app.route("/seller", createSellerQueueRoutes({ sessions: sessionService, queue: sellerQueueService }));
  app.route("/seller", createSellerFulfillmentRoutes({ sessions: sessionService, fulfillment: sellerFulfillmentService }));
  app.route("/seller/finance", createSellerFinanceRoutes({ sessions: sessionService, finance: sellerFinanceService }));
  app.route("/seller/promotions", createSellerPromotionRoutes({ sessions: sessionService, promotions: sellerPromotionService }));
  app.route("/seller/reviews", createSellerReviewRoutes({ sessions: sessionService, reviews: sellerReviewService }));
  app.route("/seller/taxonomy", createSellerTaxonomyRoutes({ sessions: sessionService, taxonomy: taxonomyService }));
  app.route("/seller/notifications", createSellerNotificationRoutes({ sessions: sessionService, notifications: sellerNotifications }));
  app.route("/seller", createSellerRoutes({ sessions: sessionService, sellerCatalog: sellerCatalogService, orders: orderService }));
  app.route("/admin/analytics", createAdminAnalyticsRoutes({ sessions: sessionService, analytics: adminAnalyticsService }));
  app.route("/admin/sellers", createAdminSellerRoutes({ sessions: sessionService, sellers: adminSellerService }));
  app.route("/admin/reviews", createAdminReviewRoutes({ sessions: sessionService, reviews: adminReviewService }));
  app.route("/admin/finance", createAdminFinanceRoutes({ sessions: sessionService, finance: adminFinanceService }));
  app.route("/admin/taxonomy", createAdminTaxonomyRoutes({ sessions: sessionService, taxonomy: taxonomyService }));
  app.route("/admin/categories", createAdminCategoryRoutes({ sessions: sessionService, categories: adminCategoryService }));
  app.route("/admin/orders", createAdminOrderRoutes({ sessions: sessionService, orders: adminOrderService }));
  app.route("/admin/products", createAdminProductRoutes({ sessions: sessionService, products: adminProductService }));
  app.route("/admin/promotions", createAdminPromotionRoutes({ sessions: sessionService, promotions: adminPromotionService }));
  app.route("/admin/audit-records", createAuditRoutes({ sessions: sessionService, audit: auditService }));
  app.route("/admin", createAdminRoutes({ sessions: sessionService, dashboard: adminDashboardService }));
  app.route("/auth", createAuthRoutes({ auth: authService, sessions: sessionService, secureCookies: environment.NODE_ENV === "production", admission: authAdmission }));
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  });
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  return app;
}
