"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Bell, Boxes, ChartNoAxesCombined, CircleDollarSign, ClipboardCheck, FolderTree, LayoutDashboard, Megaphone, PackageSearch, Settings2, ShoppingBag, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiError, getJSON, patchJSON, postJSON } from "@/lib/api";
import { SellerProductForm } from "@/features/seller/SellerProductForm";
import { SellerProductEditor } from "@/features/seller/SellerProductEditor";
import { SellerProductAssets } from "@/features/seller/SellerProductAssets";
import { SellerTaxonomyManagement } from "@/features/seller/SellerTaxonomyManagement";
import { SellerPromotionForm } from "@/features/seller/SellerPromotionForm";
import { SellerPromotionEditor } from "@/features/seller/SellerPromotionEditor";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { orderItemSummary } from "@/features/seller/seller-order.utils";
import { replaceSellerProductStock, validateSellerStock } from "@/features/seller/seller-stock-management";
import { filterSellerProducts } from "@/features/seller/seller-product-filtering";
import type { SellerProductFilters } from "@/features/seller/seller-product-filtering";
import type { SellerAnalytics, SellerFinance, SellerNotification, SellerOrder, SellerProduct, SellerPromotion, SellerReview, SellerStoreProfile } from "@/types/seller";
import type { FulfillmentStatus } from "@/types/account";
import styles from "./SellerDashboard.module.css";

const fulfillmentStatuses = ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned"] as const;
const fulfillmentNextStatuses: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
type FulfillmentFeedback = { kind: "pending" | "success" | "error"; message: string };
type FulfillmentChange = { order: SellerOrder; item: SellerOrder["items"][number]; status: FulfillmentStatus };
type StockFeedback = { kind: "pending" | "success" | "error"; message: string };
type WorkspaceState = "loading" | "ready" | "error";
type LogoutState = { state: "idle" } | { state: "pending" } | { state: "error"; message: string };
type SellerSection = "overview" | "analytics" | "profile" | "catalog" | "inventory" | "taxonomy" | "promotions" | "fulfillment" | "finance" | "reviews" | "notifications";

const sellerSections: { section: SellerSection; label: string; group: "Operate" | "Manage"; icon: LucideIcon }[] = [
  { section: "overview", label: "Overview", group: "Operate", icon: LayoutDashboard },
  { section: "fulfillment", label: "Fulfillment", group: "Operate", icon: ClipboardCheck },
  { section: "notifications", label: "Notifications", group: "Operate", icon: Bell },
  { section: "analytics", label: "Analytics", group: "Operate", icon: ChartNoAxesCombined },
  { section: "catalog", label: "Catalog", group: "Manage", icon: ShoppingBag },
  { section: "inventory", label: "Inventory", group: "Manage", icon: Boxes },
  { section: "taxonomy", label: "Taxonomy", group: "Manage", icon: FolderTree },
  { section: "promotions", label: "Promotions", group: "Manage", icon: Megaphone },
  { section: "profile", label: "Store profile", group: "Manage", icon: Settings2 },
  { section: "finance", label: "Finance", group: "Manage", icon: CircleDollarSign },
  { section: "reviews", label: "Reviews", group: "Manage", icon: Star },
];

const isSellerSection = (value: string | undefined): value is SellerSection => sellerSections.some((item) => item.section === value);

export function SellerDashboard() {
  const pathname = usePathname();
  const requestedSection = pathname.split("/").filter(Boolean)[1];
  const activeSection: SellerSection = isSellerSection(requestedSection) ? requestedSection : "overview";
  const commandTarget = activeSection === "catalog" ? "inventory" : "catalog";
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [promotions, setPromotions] = useState<SellerPromotion[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [finance, setFinance] = useState<SellerFinance | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutFeedback, setPayoutFeedback] = useState("");
  const [payoutConfirmation, setPayoutConfirmation] = useState(false);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [profile, setProfile] = useState<SellerStoreProfile | null>(null);
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [readingNotificationId, setReadingNotificationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [analyticsError, setAnalyticsError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [promotionSuccess, setPromotionSuccess] = useState("");
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("loading");
  const [logoutState, setLogoutState] = useState<LogoutState>({ state: "idle" });
  const [createTarget, setCreateTarget] = useState<"product" | "promotion" | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [productFilters, setProductFilters] = useState<SellerProductFilters>({ query: "", categoryId: "all", status: "all" });

  const [stockFeedback, setStockFeedback] = useState<Record<string, StockFeedback>>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [fulfillmentFeedback, setFulfillmentFeedback] = useState<Record<string, FulfillmentFeedback>>({});
  const [fulfillmentConfirmation, setFulfillmentConfirmation] = useState<FulfillmentChange | null>(null);
  const [failedFulfillmentChange, setFailedFulfillmentChange] = useState<FulfillmentChange | null>(null);
  const reviewsRequestPending = useRef(false);
  const analyticsRequestPending = useRef(false);
  const reviewsRequestController = useRef<AbortController | null>(null);
  const analyticsRequestController = useRef<AbortController | null>(null);
  const workspaceRequestController = useRef<AbortController | null>(null);
  const notificationsRequestController = useRef<AbortController | null>(null);

  const loadNotifications = useCallback(() => {
    notificationsRequestController.current?.abort();
    const controller = new AbortController();
    notificationsRequestController.current = controller;
    setNotificationsLoading(true);
    setNotificationsError("");
    getJSON<{ notifications: SellerNotification[]; unreadCount: number }>("/seller/notifications", controller.signal)
      .then((feed) => { if (!controller.signal.aborted) { setNotifications(feed.notifications); setUnreadCount(feed.unreadCount); } })
      .catch(() => { if (!controller.signal.aborted) setNotificationsError("Unable to load notifications. Try again."); })
      .finally(() => { if (!controller.signal.aborted) setNotificationsLoading(false); });
  }, []);

  const loadReviews = useCallback(() => {
    if (reviewsRequestPending.current) return;
    const controller = new AbortController();
    reviewsRequestPending.current = true;
    reviewsRequestController.current = controller;
    setReviewsLoading(true);
    setReviewError("");
    getJSON<{ reviews: SellerReview[] }>("/seller/reviews", controller.signal)
      .then((reviewFeed) => { if (!controller.signal.aborted) setReviews(reviewFeed.reviews); })
      .catch(() => { if (!controller.signal.aborted) setReviewError("Unable to load customer reviews. Refresh the page to try again."); })
      .finally(() => {
        if (reviewsRequestController.current === controller) {
          reviewsRequestPending.current = false;
          reviewsRequestController.current = null;
        }
        if (!controller.signal.aborted) setReviewsLoading(false);
      });
  }, []);

  const loadAnalytics = useCallback(() => {
    if (analyticsRequestPending.current) return;
    const controller = new AbortController();
    analyticsRequestPending.current = true;
    analyticsRequestController.current = controller;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    getJSON<{ analytics: SellerAnalytics }>("/seller/analytics", controller.signal)
      .then((analyticsFeed) => { if (!controller.signal.aborted) setAnalytics(analyticsFeed.analytics); })
      .catch(() => { if (!controller.signal.aborted) setAnalyticsError("Unable to load operational analytics. Refresh the page to try again."); })
      .finally(() => {
        if (analyticsRequestController.current === controller) {
          analyticsRequestPending.current = false;
          analyticsRequestController.current = null;
        }
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });
  }, []);

  const loadWorkspace = useCallback(() => {
    workspaceRequestController.current?.abort();
    const controller = new AbortController();
    workspaceRequestController.current = controller;
    setWorkspaceState("loading");
    setError("");
    const request = activeSection === "overview" || activeSection === "catalog" || activeSection === "inventory" || activeSection === "taxonomy"
      ? getJSON<{ products: SellerProduct[] }>("/seller/products", controller.signal).then((catalog) => { setProducts(catalog.products); })
      : activeSection === "promotions"
        ? Promise.all([
          getJSON<{ products: SellerProduct[] }>("/seller/products", controller.signal),
          getJSON<{ promotions: SellerPromotion[] }>("/seller/promotions", controller.signal),
        ]).then(([catalog, promotionFeed]) => { setProducts(catalog.products); setPromotions(promotionFeed.promotions); })
        : activeSection === "fulfillment"
          ? getJSON<{ orders: SellerOrder[] }>("/seller/orders", controller.signal).then((orderFeed) => { setOrders(orderFeed.orders); })
          : activeSection === "finance"
            ? getJSON<SellerFinance>("/seller/finance", controller.signal).then((financeOverview) => { setFinance(financeOverview); })
            : activeSection === "notifications"
              ? Promise.resolve()
              : getJSON<{ profile: SellerStoreProfile }>("/seller/application", controller.signal).then((application) => { setProfile(application.profile); });
    request
      .then(() => {
        if (controller.signal.aborted) return;
        setWorkspaceState("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Unable to load your workspace");
        setWorkspaceState("error");
      });
  }, [activeSection]);

  async function requestPayout() {
    setPayoutSubmitting(true); setPayoutFeedback("");
    try { await postJSON("/seller/finance/payout-requests", { amount: payoutAmount }); setPayoutAmount(""); setPayoutFeedback("Payout request submitted for admin review."); setPayoutConfirmation(false); loadWorkspace(); }
    catch (reason) { setPayoutFeedback(reason instanceof Error ? reason.message : "Unable to request payout review."); }
    finally { setPayoutSubmitting(false); }
  }

  useEffect(() => {
    if (activeSection === "analytics" || activeSection === "reviews") return;
    const timer = window.setTimeout(loadWorkspace, 0);
    return () => { window.clearTimeout(timer); workspaceRequestController.current?.abort(); };
  }, [activeSection, loadWorkspace]);

  useEffect(() => {
    if (activeSection !== "reviews") return;
    loadReviews();
    return () => {
      const controller = reviewsRequestController.current;
      controller?.abort();
      if (reviewsRequestController.current === controller) {
        reviewsRequestPending.current = false;
        reviewsRequestController.current = null;
      }
    };
  }, [activeSection, loadReviews]);

  useEffect(() => {
    if (activeSection !== "analytics") return;
    loadAnalytics();
    return () => {
      const controller = analyticsRequestController.current;
      controller?.abort();
      if (analyticsRequestController.current === controller) {
        analyticsRequestPending.current = false;
        analyticsRequestController.current = null;
      }
    };
  }, [activeSection, loadAnalytics]);

  useEffect(() => {
    if (activeSection !== "notifications") return;
    const timer = window.setTimeout(loadNotifications, 0);
    return () => { window.clearTimeout(timer); notificationsRequestController.current?.abort(); };
  }, [activeSection, loadNotifications]);

  const markNotificationRead = async (notification: SellerNotification) => {
    if (notification.readAt || readingNotificationId) return;
    setReadingNotificationId(notification.id);
    try {
      const result = await patchJSON<{ notification: SellerNotification }>(`/seller/notifications/${notification.id}/read`);
      setNotifications((items) => items.map((item) => item.id === notification.id ? result.notification : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (reason) {
      setNotificationsError(reason instanceof Error ? reason.message : "Unable to mark the notification as read. Try again.");
    } finally { setReadingNotificationId(null); }
  };

  const logout = async () => {
    setLogoutState({ state: "pending" });
    try {
      await postJSON<void>("/auth/logout", {});
      window.location.assign("/");
    } catch (reason) {
      setLogoutState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to sign out. Please try again." });
    }
  };

  const saveStock = async (event: FormEvent<HTMLFormElement>, product: SellerProduct) => {
    event.preventDefault();
    const stockValue = String(new FormData(event.currentTarget).get("stock") ?? "");
    const validationError = validateSellerStock(stockValue);
    if (validationError) {
      setStockFeedback((entries) => ({ ...entries, [product.id]: { kind: "error", message: validationError } }));
      return;
    }
    const stock = Number(stockValue);
    setStockFeedback((entries) => ({ ...entries, [product.id]: { kind: "pending", message: "Saving stock…" } }));
    try {
      await patchJSON<void>(`/seller/products/${product.id}/stock`, { stock });
      setProducts((items) => replaceSellerProductStock(items, product.id, stock));
      setStockFeedback((entries) => ({ ...entries, [product.id]: { kind: "success", message: "Stock updated." } }));
    } catch (reason) {
      const message = reason instanceof ApiError && reason.status === 404
        ? "This product is no longer available."
        : reason instanceof Error ? reason.message : "Unable to update stock.";
      setStockFeedback((entries) => ({ ...entries, [product.id]: { kind: "error", message } }));
    }
  };


  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const storeName = String(formData.get("storeName") ?? "");
    const description = String(formData.get("description") ?? "");
    setProfileSaving(true); setProfileError(""); setProfileSuccess("");
    try {
      const result = await patchJSON<{ profile: SellerStoreProfile }>("/seller/profile", { storeName, description });
      setProfile(result.profile);
      setProfileSuccess("Store profile saved.");
    } catch (reason) {
      setProfileError(reason instanceof ApiError && reason.status === 409 ? "Store name already in use" : reason instanceof Error ? reason.message : "Unable to save store profile");
    } finally { setProfileSaving(false); }
  };

  const updateFulfillment = async (order: SellerOrder, item: SellerOrder["items"][number], status: FulfillmentStatus) => {
    const feedbackKey = `${order.id}:${item.id}`;
    setFulfillmentFeedback((entries) => ({ ...entries, [feedbackKey]: { kind: "pending", message: "Updating…" } }));
    try {
      const result = await patchJSON<{ fulfillment: { orderId: string; fulfillmentStatus: FulfillmentStatus } }>(`/seller/order-items/${item.id}/fulfillment`, { status });
      setOrders((currentOrders) => currentOrders.map((order) => order.id === result.fulfillment.orderId
        ? { ...order, items: order.items.map((candidate) => candidate.id === item.id ? { ...candidate, fulfillmentStatus: result.fulfillment.fulfillmentStatus } : candidate) }
        : order));
      setFulfillmentFeedback((entries) => ({ ...entries, [feedbackKey]: { kind: "success", message: "Fulfillment status updated." } }));
      setFailedFulfillmentChange(null);
    } catch (reason) {
      const message = reason instanceof ApiError && reason.status === 404
        ? "This order line is no longer available."
        : reason instanceof ApiError && reason.status === 409
          ? "This fulfillment status is no longer available."
          : reason instanceof Error ? reason.message : "Unable to update fulfillment status.";
      setFulfillmentFeedback((entries) => ({ ...entries, [feedbackKey]: { kind: "error", message } }));
      setFailedFulfillmentChange({ order, item, status });
    }
  };

  const confirmFulfillmentUpdate = () => {
    if (!fulfillmentConfirmation) return;
    const change = fulfillmentConfirmation;
    setFulfillmentConfirmation(null);
    void updateFulfillment(change.order, change.item, change.status);
  };

  const summary = useMemo(() => ({
    total: products.length,
    live: products.filter((product) => product.isPublished).length,
    lowStock: products.filter((product) => product.stock > 0 && product.stock < 6).length,
  }), [products]);
  const inventoryAttention = useMemo(() => products
    .filter((product) => product.stock === 0 || (product.stock > 0 && product.stock < 6))
    .sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name))
    .slice(0, 6), [products]);
  const filteredProducts = useMemo(() => filterSellerProducts(products, productFilters), [products, productFilters]);
  const categoryIds = useMemo(() => Array.from(new Set(products.flatMap((product) => product.categoryId ? [product.categoryId] : []))).sort(), [products]);
  const hasActiveProductFilters = productFilters.query.trim() !== "" || productFilters.categoryId !== "all" || productFilters.status !== "all";

  return <main className={`seller-shell seller-workspace orchid-shell orchid-shell--operate ${styles.workspace}`} data-seller-section={activeSection}>
    <a className="skip-link" href="#seller-workspace-content">Skip to workspace content</a>
    <aside className={styles.sellerSidebar} data-seller-rail="persistent" aria-label="NexaMart seller operations">
      <Link className={styles.sellerBrand} href="/" aria-label="NexaMart storefront">NEXA<span>•</span>MART</Link>
      <div className={styles.sellerIdentity}><span>Seller console</span><strong>Store operations</strong><small>Manage your owned catalog</small></div>
      <nav className={styles.sellerNavigation} aria-label="Seller sections">{(["Operate", "Manage"] as const).map((group) => <div key={group}><p>{group}</p>{sellerSections.filter((item) => item.group === group).map((item) => { const Icon = item.icon; return <Link key={item.section} href={`/seller/${item.section}`} aria-current={item.section === activeSection ? "page" : undefined} className={item.section === activeSection ? styles.activeNav : undefined}><span aria-hidden="true"><Icon size={15} strokeWidth={1.8} /></span>{item.label}</Link>; })}</div>)}</nav>
      <Link className={styles.storefrontLink} href="/">View storefront <PackageSearch aria-hidden="true" size={14} strokeWidth={1.8} /></Link>
    </aside>
    <div className={styles.sellerContent} id="seller-workspace-content" tabIndex={-1}>
    <header className={`seller-topbar seller-workspace-topbar ${styles.commandBar}`} aria-label="Seller workspace command"><div className={styles.operationsHeader}><div className={styles.workspaceContext}><span>Seller workspace</span><span className={styles.liveMarker}>Operate</span><span className={styles.sectionContext}>{sellerSections.find((item) => item.section === activeSection)?.label}</span></div><div className={styles.topbarActions}><Link className={styles.topbarAction} href={`/seller/${commandTarget}`}>{activeSection === "catalog" ? "Manage inventory" : "Manage catalog"}</Link><button className={styles.topbarAction} type="button" onClick={() => void logout()} disabled={logoutState.state === "pending"}>{logoutState.state === "pending" ? "Signing out…" : "Sign out"}</button>{logoutState.state === "error" && <div className={styles.logoutRecovery} role="alert"><p>{logoutState.message}</p><button className={styles.topbarAction} type="button" onClick={() => void logout()}>Try signing out again</button></div>}</div></div></header>
    <section className={styles.workspaceIntro} aria-labelledby="seller-workspace-heading"><p className="eyebrow">Seller command workspace</p><h1 id="seller-workspace-heading">{sellerSections.find((item) => item.section === activeSection)?.label}</h1><p>Owned records and actions for this part of your store.</p></section>
    <div className={styles.activeWorkspace}>
    {activeSection !== "analytics" && activeSection !== "reviews" && workspaceState === "loading" ? <p className={styles.workspaceState} role="status" aria-live="polite">Loading your seller workspace…</p> : activeSection !== "analytics" && activeSection !== "reviews" && workspaceState === "error" ? <section className="seller-empty" role="alert" aria-labelledby="seller-workspace-error-heading"><p className="eyebrow">Workspace unavailable</p><h2 id="seller-workspace-error-heading">Unable to load {sellerSections.find((item) => item.section === activeSection)?.label}</h2><p>Your seller data was not loaded. Try again to request the selected workspace.</p><strong>{error}</strong><button className="primary-button" type="button" onClick={loadWorkspace}>Retry workspace</button></section> : <>
    {activeSection === "notifications" && <section className="seller-notifications" aria-labelledby="seller-notifications-heading" aria-busy={notificationsLoading}><div className="seller-queue-head"><div><p className="eyebrow">Store activity</p><h2 id="seller-notifications-heading" tabIndex={-1}>Notifications</h2><p className="seller-form-note">In-app records for your store activity.</p></div><p className="seller-state" aria-live="polite">{unreadCount} unread</p></div>{notificationsLoading ? <p className={styles.workspaceState} role="status" aria-live="polite">Loading notifications…</p> : notificationsError ? <section className={`seller-empty ${styles.workspaceState}`} role="alert"><strong>{notificationsError}</strong><button type="button" onClick={loadNotifications}>Retry</button></section> : notifications.length ? <div className="seller-list">{notifications.map((notification) => <article className="seller-row" key={notification.id}><div><strong>{notification.title}</strong><small>{notification.body}</small><time dateTime={notification.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.createdAt))}</time></div>{notification.readAt ? <span className="status">Read</span> : <button type="button" onClick={() => void markNotificationRead(notification)} disabled={readingNotificationId === notification.id}>{readingNotificationId === notification.id ? "Marking read…" : "Mark as read"}</button>}</article>)}</div> : <section className={`seller-empty ${styles.workspaceState}`}><h3>No notifications yet.</h3><p>Moderation decisions and new owned order lines will appear here.</p></section>}</section>}
    {activeSection === "overview" && <>
      <div className={styles.priorityGrid}><section className="seller-metrics" aria-label="Catalog summary"><article><span>Total products</span><strong>{summary.total}</strong></article><article><span>Published</span><strong>{summary.live}</strong></article><article className={styles.inventorySignal}><span>Low stock</span><strong>{summary.lowStock}</strong></article></section></div>
      {inventoryAttention.length ? <section className={styles.inventoryAttention} aria-labelledby="seller-inventory-attention-heading"><div className={styles.inventoryAttentionHead}><div><p className="eyebrow">Catalog queue</p><h2 id="seller-inventory-attention-heading">Inventory attention</h2><p>Products from your loaded catalog that need a stock update.</p></div><Link href="/seller/inventory">Open inventory</Link></div><div className={styles.inventoryAttentionList}>{inventoryAttention.map((product) => <article key={product.id}><div><strong>{product.name}</strong><small>{product.isPublished ? "Published" : "Draft"}</small></div><span className={product.stock === 0 ? styles.outOfStock : styles.lowStock}>{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}</span></article>)}</div></section> : <section className={`${styles.inventoryAttention} ${styles.workspaceState}`} aria-labelledby="seller-inventory-attention-heading"><p className="eyebrow">Catalog queue</p><h2 id="seller-inventory-attention-heading">Inventory attention</h2><p>No inventory needs attention right now.</p><Link href="/seller/inventory">Review inventory</Link></section>}
    </>}
    {activeSection === "analytics" && <section className="seller-analytics" aria-labelledby="seller-analytics-heading">
      <div className="seller-analytics-head"><p className="eyebrow">Operations</p><h2 id="seller-analytics-heading">Operational analytics</h2><p>Read-only operational summary of your catalog and owned order lines.</p></div>
      {analyticsLoading ? <p className={styles.workspaceState} role="status" aria-live="polite">Loading operational analytics…</p> : analyticsError ? <div className={`seller-empty ${styles.workspaceState}`} role="alert"><strong>{analyticsError}</strong><button type="button" onClick={loadAnalytics} disabled={analyticsLoading} aria-label="Retry operational analytics">Retry analytics</button></div> : analytics ? <>
        <div className="seller-analytics-scope"><span>Catalog scope: {analytics.catalog.scope}</span><span>Order scope: {analytics.orders.scope}</span></div>
        <div className="seller-analytics-summary" aria-label="Catalog analytics"><article><span>Total products</span><strong>{analytics.catalog.total}</strong></article><article><span>Published</span><strong>{analytics.catalog.published}</strong></article><article><span>Draft</span><strong>{analytics.catalog.draft}</strong></article><article><span>Stock units</span><strong>{analytics.catalog.stock}</strong></article><article><span>Out of stock</span><strong>{analytics.catalog.outOfStock}</strong></article></div>
        <div className="seller-analytics-orders"><article><span>Owned order lines</span><strong>{analytics.orders.orderLineCount}</strong></article><article><span>Units sold</span><strong>{analytics.orders.unitsSold}</strong></article><article><span>Gross sales</span><strong>{analytics.orders.grossSales}</strong></article></div>
        <div className="seller-analytics-fulfillment"><h3>Fulfillment status counts</h3><div>{fulfillmentStatuses.map((status) => <article key={status}><span>{status}</span><strong>{analytics.orders.fulfillmentStatusCounts[status]}</strong></article>)}</div></div>
        {analytics.catalog.total === 0 && analytics.orders.orderLineCount === 0 && <p className="seller-state">No catalog or owned order-line records yet. Values are shown as zero.</p>}
      </> : <p className="seller-state">Operational analytics are unavailable.</p>}
    </section>}
    {activeSection === "profile" && <section className="seller-profile" aria-labelledby="seller-profile-heading">
      <div><p className="eyebrow">Storefront</p><h2 id="seller-profile-heading">Store profile</h2><p className="seller-form-note">Update the public name and description for your store.</p></div>
      {profile ? <form onSubmit={saveProfile}>
        <label htmlFor="seller-store-name">Store name</label>
        <input id="seller-store-name" name="storeName" defaultValue={profile.storeName} required disabled={profileSaving} />
        <label htmlFor="seller-store-description">Description</label>
        <textarea id="seller-store-description" name="description" defaultValue={profile.description ?? ""} disabled={profileSaving} />
        <button className="primary-button" type="submit" disabled={profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button>
        {profileSuccess && <p className="seller-profile-success" role="status">{profileSuccess}</p>}
        {profileError && <p className="seller-error" role="alert">{profileError}</p>}
      </form> : <p className="seller-state">Store profile is unavailable.</p>}
    </section>}
    {activeSection === "finance" && <section className="seller-finance" aria-labelledby="seller-finance-heading">
      <div className="seller-finance-head"><p className="eyebrow">Seller finance</p><h2 id="seller-finance-heading">Finance overview</h2><p>Eligible commissions can be requested for admin review. This does not execute a payout.</p></div>
      {finance ? <>
        <div className="seller-finance-summary" aria-label="Finance summary">
          <article><span>Accrued net amount</span><strong>{finance.summary.accruedNetAmount}</strong></article>
          <article><span>Eligible net amount</span><strong>{finance.summary.eligibleNetAmount}</strong></article>
          <article><span>Available for review</span><strong>{finance.summary.payableAmount}</strong></article>
          <article><span>Held in review</span><strong>{finance.summary.heldPayoutAmount}</strong></article>
        </div>
        <form className="seller-finance-history" onSubmit={(event) => { event.preventDefault(); setPayoutConfirmation(true); }}><h3>Request payout review</h3><label htmlFor="payout-amount">Amount<input id="payout-amount" value={payoutAmount} onChange={(event) => setPayoutAmount(event.target.value)} inputMode="decimal" pattern="\\d+(\\.\\d{1,2})?" required disabled={payoutSubmitting} /></label><button className="primary-button" type="submit" disabled={payoutSubmitting || !payoutAmount}>Request review</button>{payoutFeedback && <p role="status">{payoutFeedback}</p>}</form>
        <div className="seller-finance-history"><h3>Request history</h3>{finance.payouts.length ? finance.payouts.map((payout) => <article key={payout.id}><strong>{payout.reference}</strong><small>{payout.amount}</small><span className="status">{payout.status === "pending" ? "Requested review" : payout.status}</span></article>) : <p className="seller-state">No payout review requests yet.</p>}</div>
        <div className="seller-finance-history"><h3>Commission ledger</h3>{finance.commissions.length ? finance.commissions.map((commission) => <article key={commission.id}><div><strong>{commission.orderReference}</strong><small>Net amount: {commission.netAmount} · Commission: {commission.commissionAmount} · Rate: {commission.ratePercent}</small></div><time dateTime={commission.createdAt}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(commission.createdAt))}</time><span className="status">{commission.status === "void" ? "Void ledger entry" : "Recorded ledger entry"}</span></article>) : <p className="seller-state">No commission ledger entries yet.</p>}</div>
      </> : <p className="seller-state">Finance information is unavailable.</p>}
    </section>}
    {activeSection === "reviews" && <section className="seller-reviews" aria-labelledby="seller-reviews-heading">
      <div className="seller-reviews-head"><p className="eyebrow">Customer feedback</p><h2 id="seller-reviews-heading">Customer reviews</h2><p>Read-only feedback for products in your catalog.</p></div>
      {reviewsLoading ? <p className={styles.workspaceState} role="status" aria-live="polite">Loading customer reviews…</p> : reviewError ? <div className={`seller-empty ${styles.workspaceState}`} role="alert"><strong>{reviewError}</strong><button type="button" onClick={loadReviews} disabled={reviewsLoading} aria-label="Retry customer reviews">Retry reviews</button></div> : reviews.length ? <div className="seller-review-list">{reviews.map((review) => <article className="seller-review" key={review.id}><div><strong>{review.product.name}</strong><small>{review.rating}/5 · <time dateTime={review.createdAt}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(review.createdAt))}</time></small>{review.title && <b>{review.title}</b>}{review.body ? <p>{review.body}</p> : <p>No written feedback.</p>}</div><span className={`status ${review.isVisible ? "visible" : "hidden"}`}>{review.isVisible ? "Visible" : "Hidden"}</span></article>)}</div> : <div className={`seller-empty ${styles.workspaceState}`}><strong>No customer reviews for your products yet.</strong><p>Customer feedback will appear here after eligible purchases are reviewed.</p></div>}
    </section>}
    {activeSection === "catalog" && <section className="seller-queue">
      <div className="seller-queue-head seller-catalog-workspace"><div><p className="eyebrow">Catalog queue</p><h2 id="seller-catalog-heading">Your products</h2></div><button className="primary-button" type="button" onClick={() => setCreateTarget("product")}>Add a product</button></div>
      {products.length ? <>
        <div className={styles.catalogFilters} aria-label="Filter your products">
          <label>Search<input type="search" value={productFilters.query} onChange={(event) => setProductFilters((filters) => ({ ...filters, query: event.target.value }))} aria-label="Search your products" placeholder="Search name or brand" /></label>
          <label>Category<select value={productFilters.categoryId} onChange={(event) => setProductFilters((filters) => ({ ...filters, categoryId: event.target.value }))}><option value="all">All categories</option>{categoryIds.map((categoryId) => <option key={categoryId} value={categoryId}>Category {categoryId}</option>)}<option value="uncategorized">Uncategorized</option></select></label>
          <label>Status<select value={productFilters.status} onChange={(event) => setProductFilters((filters) => ({ ...filters, status: event.target.value as SellerProductFilters["status"] }))}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></label>
          {hasActiveProductFilters && <button type="button" onClick={() => setProductFilters({ query: "", categoryId: "all", status: "all" })}>Clear filters</button>}
        </div>
        <p className="seller-state" role="status" aria-live="polite">Showing {filteredProducts.length} of {products.length} products</p>
        {filteredProducts.length ? <div className="seller-list">{filteredProducts.map((product) => <article className="seller-row" key={product.id}>
            <div><strong>{product.name}</strong><small>{product.isPublished ? "Live in the collection" : "Draft — not visible to customers"}</small></div>
            {product.isPublished && <span className="status live">Published</span>}{product.moderationStatus === "changes_requested" && <p className="seller-error" role="alert">Changes requested. Corrective guidance: {product.moderationReason ?? "Review the product details and save your corrections for review."}</p>}{product.moderationStatus === "rejected" && <p className="seller-error" role="alert">Rejected. Corrective guidance: {product.moderationReason ?? "Review the product details before resubmitting."}</p>}{product.moderationStatus === "approved" && <p className="seller-profile-success" role="status">Approved by moderation.</p>}
            <SellerProductEditor product={product} onSaved={(details) => setProducts((items) => items.map((item) => item.id === product.id ? { ...item, ...details } : item))} />
            <SellerProductAssets product={product} />
          </article>)}</div> : <div className="seller-empty"><h3>No products match these filters.</h3><p>Adjust or clear the filters to see products in your loaded catalog.</p><button type="button" onClick={() => setProductFilters({ query: "", categoryId: "all", status: "all" })}>Clear filters</button></div>}
      </> : <div className="seller-empty"><h3>Your catalog is clear.</h3><p>Add your first product to begin building the NexaMart collection.</p><button className="primary-button" type="button" onClick={() => setCreateTarget("product")}>Create product</button></div>}
    </section>}
    {activeSection === "catalog" && <SellerProductForm onCreated={(product) => setProducts((items) => [product, ...items])} open={createTarget === "product"} onOpenChange={(open) => setCreateTarget(open ? "product" : null)} />}
    {activeSection === "inventory" && <section className="seller-queue" aria-labelledby="seller-inventory-heading">
      <div className="seller-queue-head"><div><p className="eyebrow">Stock control</p><h2 id="seller-inventory-heading">Inventory</h2><p className="seller-form-note">Update the available stock for products you own.</p></div></div>
      {products.length ? <>
        <div className={styles.inventoryFilters} aria-label="Filter your inventory">
          <label>Search<input type="search" value={productFilters.query} onChange={(event) => setProductFilters((filters) => ({ ...filters, query: event.target.value }))} aria-label="Search your inventory" placeholder="Search name or brand" /></label>
          <label>Category<select value={productFilters.categoryId} onChange={(event) => setProductFilters((filters) => ({ ...filters, categoryId: event.target.value }))}><option value="all">All categories</option>{categoryIds.map((categoryId) => <option key={categoryId} value={categoryId}>Category {categoryId}</option>)}<option value="uncategorized">Uncategorized</option></select></label>
          <label>Status<select value={productFilters.status} onChange={(event) => setProductFilters((filters) => ({ ...filters, status: event.target.value as SellerProductFilters["status"] }))}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></label>
          {hasActiveProductFilters && <button type="button" onClick={() => setProductFilters({ query: "", categoryId: "all", status: "all" })}>Clear filters</button>}
        </div>
        <p className={`${styles.inventoryCount} seller-state`} role="status" aria-live="polite">Showing {filteredProducts.length} of {products.length} products</p>
        {filteredProducts.length ? <div className={styles.inventoryTableWrap}><table className={styles.inventoryTable}>
          <thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Stock</th><th scope="col">Actions</th></tr></thead>
          <tbody>{filteredProducts.map((product) => {
        const feedback = stockFeedback[product.id];
        const savingStock = feedback?.kind === "pending";
        return <tr key={product.id}>
          <td><strong>{product.name}</strong><small>{product.brand ?? "No brand"}</small></td>
          <td>{product.categoryId ? `Category ${product.categoryId}` : "Uncategorized"}</td>
          <td><span className={`status ${product.isPublished ? "live" : "draft"}`}>{product.isPublished ? "Published" : "Draft"}</span></td>
          <td><form className="seller-stock-form" aria-label={`Update stock for ${product.name}`} aria-busy={stockFeedback[product.id]?.kind === "pending"} onSubmit={(event) => void saveStock(event, product)}>
            <label className="sr-only">Stock for {product.name}<input name="stock" type="number" min="0" step="1" inputMode="numeric" defaultValue={product.stock} disabled={savingStock} /></label>
            <button type="submit" disabled={savingStock}>{savingStock ? "Saving stock…" : "Save stock"}</button>
            {feedback && <p className={`seller-stock-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
          </form></td>
          <td><div className={styles.inventoryActions}><SellerProductEditor product={product} onSaved={(details) => setProducts((items) => items.map((item) => item.id === product.id ? { ...item, ...details } : item))} /><SellerProductAssets product={product} /></div></td>
        </tr>;
      })}</tbody>
        </table></div> : <div className="seller-empty"><h3>No products match these filters.</h3><p>Adjust or clear the filters to see products in your loaded inventory.</p><button type="button" onClick={() => setProductFilters({ query: "", categoryId: "all", status: "all" })}>Clear filters</button></div>}
      </> : <div className="seller-empty"><h3>Your inventory is clear.</h3><p>Add products in your catalog before updating stock.</p><Link className="primary-button" href="/seller/catalog">Manage catalog</Link></div>}
    </section>}
    {activeSection === "taxonomy" && <SellerTaxonomyManagement products={products} onClassified={(updatedProduct) => setProducts((items) => items.map((item) => item.id === updatedProduct.id ? { ...item, ...updatedProduct, isPublished: false } : item))} />}
    {activeSection === "promotions" && <section className="seller-promotions" aria-labelledby="seller-promotions-heading">
      <div className="seller-queue-head"><div><p className="eyebrow">Product flash offers</p><h2 id="seller-promotions-heading">Product flash offers</h2><p className="seller-form-note">Server-priced product offers only. Checkout decides eligibility and final prices.</p></div><button className="primary-button" type="button" onClick={() => setCreateTarget("promotion")}>Configure a product flash offer</button></div>
      {promotions.length ? <div className="seller-promotion-list">{promotions.map((promotion) => <article className="seller-promotion-row" key={promotion.id}><div><strong>{promotion.name}</strong><small>Product: {products.find((product) => product.id === promotion.productId)?.name ?? "Selected product"} · {promotion.discountPercent}% off</small><small>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(promotion.startsAt))} – {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(promotion.endsAt))}</small></div><span className="status">Server-priced product offer</span><SellerPromotionEditor promotion={promotion} onSaved={(updatedPromotion) => setPromotions((items) => items.map((item) => item.id === updatedPromotion.id ? updatedPromotion : item))} onRemoved={(removedPromotionId) => { setPromotions((items) => items.filter((item) => item.id !== removedPromotionId)); setPromotionSuccess("Promotion deleted."); }} /></article>)}</div> : <p className="seller-state">No promotion configurations yet.</p>}
      {promotionSuccess && <p className="seller-profile-success" role="status">{promotionSuccess}</p>}
    </section>}
    {activeSection === "promotions" && <SellerPromotionForm products={products} onCreated={(promotion) => setPromotions((items) => [promotion, ...items])} open={createTarget === "promotion"} onOpenChange={(open) => setCreateTarget(open ? "promotion" : null)} />}
    {activeSection === "fulfillment" && <section className="seller-orders" aria-labelledby="seller-orders-heading">
      <div><p className="eyebrow">Fulfilment queue</p><h2 id="seller-orders-heading" tabIndex={-1}>Recent orders</h2></div>
      {orders.length ? <div className="seller-order-list">{orders.map((order) => <article className="seller-order" key={order.id}><div><strong>{order.reference}</strong><small>{orderItemSummary(order.items)}</small><div className="seller-fulfillment-lines">{order.items.map((item) => {
        const feedback = fulfillmentFeedback[`${order.id}:${item.id}`];
        const nextStatuses = fulfillmentNextStatuses[item.fulfillmentStatus];
        return <section className="seller-fulfillment-line" key={item.id}><div><strong>{item.productName}</strong><small>Quantity: {item.quantity}</small></div><span className="status">{item.fulfillmentStatus}</span>{nextStatuses.length ? <fieldset aria-label={`Update ${item.productName} fulfillment status`} disabled={feedback?.kind === "pending"}><legend>Next status</legend><div className="seller-fulfillment-actions">{fulfillmentNextStatuses[item.fulfillmentStatus].map((status) => <button key={status} type="button" onClick={() => setFulfillmentConfirmation({ order, item, status })}>{status}</button>)}</div></fieldset> : <span className="seller-fulfillment-complete">No further status changes</span>}{feedback && <p className={`seller-fulfillment-feedback ${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}{feedback?.kind === "error" && failedFulfillmentChange?.item.id === item.id && <button type="button" onClick={() => setFulfillmentConfirmation(failedFulfillmentChange)}>Retry {failedFulfillmentChange.status}</button>}</section>;
      })}</div></div><time dateTime={order.createdAt}>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(order.createdAt))}</time><span className={`status order-${order.status}`}>{order.status}</span></article>)}</div> : <p className="seller-state">No product orders yet. New orders appear here once customers check out.</p>}
    </section>}
    </>}</div>
    </div>
    {fulfillmentConfirmation && <ConfirmationDialog title={`Mark ${fulfillmentConfirmation.item.productName} as ${fulfillmentConfirmation.status}?`} description="This records the next fulfillment status for this order line only." confirmLabel={`Confirm ${fulfillmentConfirmation.status}`} tone="primary" onCancel={() => setFulfillmentConfirmation(null)} onConfirm={confirmFulfillmentUpdate} />}
    {payoutConfirmation && <ConfirmationDialog title="Request payout review?" description="This creates a review request only. It does not transfer or settle money." confirmLabel="Request review" tone="neutral" pending={payoutSubmitting} onCancel={() => setPayoutConfirmation(false)} onConfirm={() => void requestPayout()} />}
  </main>;
}
