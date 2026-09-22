"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getJSON, patchJSON, postJSON } from "@/lib/api";
import { adminOverview } from "@/features/admin/admin-overview.utils";
import { auditMetadataText, auditRecordsPath, type AuditRecordFilters } from "@/features/admin/audit-log.utils";
import { adminSearchPath, normalizeAdminSearchInput } from "@/features/admin/admin-global-search";
import { productPublicationError, replacePublishedProduct } from "@/features/admin/product-publication-moderation";
import { applyReviewVisibility, reviewModerationError } from "@/features/admin/review-moderation.utils";
import { replaceModeratedSeller, sellerModerationActions, sellerModerationError } from "@/features/admin/seller-moderation";
import { AdminTaxonomyManagement } from "@/features/admin/AdminTaxonomyManagement";
import { BrandLogo } from "@/components/BrandLogo";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import "./AdminDashboard.module.css";
import type { AdminAccount, AdminAnalytics, AdminAuditRecord, AdminDashboardData, AdminFinanceOverview, AdminOrder, AdminProduct, AdminPromotion, AdminReview, AdminSearchResult, AdminSeller, AdminSellerAction, AdminTaxonomyKind, AdminFinancePayout } from "@/types/admin";

const initialData: AdminDashboardData = { accounts: [], products: [], orders: [], promotions: [], reviews: [], auditRecords: [] };
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const timestampFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const moneyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const fulfillmentStatuses = ["pending", "processing", "packed", "shipped", "delivered", "cancelled", "returned"] as const;
const adminFinancialStatus = (status: string) => status === "paid" ? "recorded" : status;

const safeReviewImageUrl = (imageUrl: string) => {
  try {
    const url = new URL(imageUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

type VisibilityChange = { reviewId: string; isVisible: boolean };
type PublicationChange = { productId: string; isPublished: boolean; expectedRevision: string };
type ModerationChange = { productId: string; status: "approved" | "rejected" | "changes_requested"; reason: string; expectedRevision: string };
type SellerChange = { sellerId: string; action: AdminSellerAction };
type PayoutReviewChange = { payout: AdminFinancePayout; decision: "approve" | "reject" };
type LogoutState = { state: "idle" } | { state: "pending" } | { state: "error"; message: string };
type AdminConfirmation =
  | { kind: "seller"; change: SellerChange }
  | { kind: "publication"; change: PublicationChange }
  | { kind: "moderation"; change: ModerationChange }
  | { kind: "visibility"; change: VisibilityChange }
  | { kind: "payout"; change: PayoutReviewChange };

export function createAuditRequestTracker() {
  let latestRequestId = 0;
  return {
    start: () => ++latestRequestId,
    isCurrent: (requestId: number) => requestId === latestRequestId,
  };
}

type AdminSection = "overview" | "applications" | "orders" | "feedback" | "finance" | "analytics" | "audit" | "sellers" | "products" | "taxonomy" | "promotions" | "accounts";

type AdminSectionDefinition = { section: AdminSection; label: string; railLabel?: string; group: "Operate" | "Configure"; icon: string };

const adminSections: AdminSectionDefinition[] = [
  { section: "overview", label: "Overview", group: "Operate", icon: "▦" },
  { section: "applications", label: "Seller applications", railLabel: "Seller Review", group: "Operate", icon: "◫" },
  { section: "orders", label: "Orders", group: "Operate", icon: "□" },
  { section: "feedback", label: "Feedback", group: "Operate", icon: "◌" },
  { section: "finance", label: "Finance", railLabel: "Payout Review", group: "Operate", icon: "$" },
  { section: "analytics", label: "Analytics", group: "Operate", icon: "⌁" },
  { section: "audit", label: "Audit trail", railLabel: "Admin Audit", group: "Operate", icon: "≡" },
  { section: "sellers", label: "Sellers", group: "Configure", icon: "♙" },
  { section: "products", label: "Products", railLabel: "Product Moderation", group: "Configure", icon: "◇" },
  { section: "taxonomy", label: "Taxonomy", group: "Configure", icon: "⌘" },
  { section: "promotions", label: "Promotions", group: "Configure", icon: "✦" },
  { section: "accounts", label: "Accounts", railLabel: "Settings", group: "Configure", icon: "◉" },
];

const adminPrimaryWorkflowOrder: AdminSection[] = ["overview", "applications", "products", "taxonomy", "finance", "audit", "accounts"];
const adminSecondaryWorkflowOrder: AdminSection[] = ["sellers", "orders", "feedback", "analytics", "promotions"];
const adminControlRoomOrder: AdminSection[] = [...adminPrimaryWorkflowOrder, ...adminSecondaryWorkflowOrder];

const isAdminSection = (value: string | undefined): value is AdminSection => adminSections.some((item) => item.section === value);

const adminProductLinks = [
  { href: "/admin/products", label: "Product overview" },
  { href: "/admin/products/brands/create", label: "Create brand" },
  { href: "/admin/products/categories/create", label: "Create category" },
  { href: "/admin/products/subcategories/create", label: "Create subcategory" },
  { href: "/admin/products/add", label: "Seller catalog guidance" },
] as const;

function AdminNavIcon({ symbol }: { symbol: string }) {
  return <span className="admin-nav-icon" aria-hidden="true">{symbol}</span>;
}

export function AdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const requestedSection = pathname.split("/").filter(Boolean)[1];
  const activeSection: AdminSection = isAdminSection(requestedSection) ? requestedSection : "overview";
  const productOperation = pathname.split("/").filter(Boolean)[2];
  const productCreateKind: AdminTaxonomyKind | undefined = productOperation === "brands" ? "brand" : productOperation === "categories" ? "category" : productOperation === "subcategories" ? "subcategory" : undefined;
  const workspaceContentRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<AdminDashboardData>(initialData);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewLoadError, setReviewLoadError] = useState("");
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState("");
  const [accountLimit, setAccountLimit] = useState("25");
  const [orderLoading, setOrderLoading] = useState(true);
  const [promotionLoading, setPromotionLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const [orderError, setOrderError] = useState("");
  const [promotionError, setPromotionError] = useState("");
  const [productError, setProductError] = useState("");
  const [auditError, setAuditError] = useState("");
  const [auditLoading, setAuditLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState("10");
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [auditAction, setAuditAction] = useState("");
  const [auditResourceType, setAuditResourceType] = useState("");
  const [auditLimit, setAuditLimit] = useState("");
  const [appliedAuditFilters, setAppliedAuditFilters] = useState<AuditRecordFilters>({});
  const [finance, setFinance] = useState<AdminFinanceOverview | null>(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeError, setFinanceError] = useState("");
  const [financeFeedback, setFinanceFeedback] = useState("");
  const [updatingPayoutIds, setUpdatingPayoutIds] = useState<Set<string>>(() => new Set());
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [failedVisibilityChange, setFailedVisibilityChange] = useState<VisibilityChange | null>(null);
  const [updatingReviewIds, setUpdatingReviewIds] = useState<Set<string>>(() => new Set());
  const [publicationError, setPublicationError] = useState("");
  const [publicationSuccess, setPublicationSuccess] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [updatingProductIds, setUpdatingProductIds] = useState<Set<string>>(() => new Set());
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [sellerLoading, setSellerLoading] = useState(true);
  const [sellerLoadError, setSellerLoadError] = useState("");
  const [sellerFeedback, setSellerFeedback] = useState<Record<string, { kind: "success" | "error"; message: string }>>({});
  const [updatingSellerIds, setUpdatingSellerIds] = useState<Set<string>>(() => new Set());
  const [confirmation, setConfirmation] = useState<AdminConfirmation | null>(null);
  const [logoutState, setLogoutState] = useState<LogoutState>({ state: "idle" });
  const productRequestPending = useRef(false);
  const productRequestController = useRef<AbortController | null>(null);
  const sellerRequestPending = useRef(false);
  const sellerRequestController = useRef<AbortController | null>(null);
  const financeRequestPending = useRef(false);
  const financeRequestController = useRef<AbortController | null>(null);
  const analyticsRequestPending = useRef(false);
  const analyticsRequestController = useRef<AbortController | null>(null);
  const auditRequestController = useRef<AbortController | null>(null);
  const auditRequestTracker = useRef(createAuditRequestTracker());
  const searchRequestController = useRef<AbortController | null>(null);
  const searchRequestId = useRef(0);
  const reviewRequestPending = useRef(false);
  const reviewRequestController = useRef<AbortController | null>(null);
  const reviewMutationIds = useRef(new Set<string>());
  const productMutationIds = useRef(new Set<string>());
  const sellerMutationIds = useRef(new Set<string>());
  const payoutMutationIds = useRef(new Set<string>());

  const loadAuditRecords = useCallback(async (filters: AuditRecordFilters = {}) => {
    auditRequestController.current?.abort();
    const controller = new AbortController();
    const requestId = auditRequestTracker.current.start();
    auditRequestController.current = controller;
    setAuditLoading(true);
    setAuditError("");
    try {
      const { records } = await getJSON<{ records: AdminAuditRecord[] }>(auditRecordsPath(filters), controller.signal);
      if (auditRequestTracker.current.isCurrent(requestId) && !controller.signal.aborted) setData((current) => ({ ...current, auditRecords: records }));
    } catch {
      if (auditRequestTracker.current.isCurrent(requestId) && !controller.signal.aborted) setAuditError("Unable to load audit records.");
    } finally {
      if (auditRequestTracker.current.isCurrent(requestId) && auditRequestController.current === controller) {
        auditRequestController.current = null;
        setAuditLoading(false);
      }
    }
  }, []);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    setAccountLoading(true);
    setAccountError("");
    try {
      const { accounts } = await getJSON<{ accounts: AdminAccount[] }>(`/admin/accounts?limit=${accountLimit}`, signal);
      if (!signal?.aborted) setData((current) => ({ ...current, accounts }));
    } catch {
      if (!signal?.aborted) setAccountError("Unable to load account records.");
    } finally {
      if (!signal?.aborted) setAccountLoading(false);
    }
  }, [accountLimit]);

  const loadProducts = useCallback(() => {
    if (productRequestPending.current) return;
    const controller = new AbortController();
    productRequestPending.current = true;
    productRequestController.current = controller;
    setProductLoading(true);
    setProductError("");
    getJSON<{ products: AdminProduct[] }>("/admin/products", controller.signal)
      .then((productFeed) => { if (!controller.signal.aborted) setData((current) => ({ ...current, products: productFeed.products })); })
      .catch(() => { if (!controller.signal.aborted) setProductError("Unable to load product records."); })
      .finally(() => {
        if (productRequestController.current === controller) {
          productRequestPending.current = false;
          productRequestController.current = null;
        }
        if (!controller.signal.aborted) setProductLoading(false);
      });
  }, []);

  const loadSellers = useCallback(() => {
    if (sellerRequestPending.current) return;
    const controller = new AbortController();
    sellerRequestPending.current = true;
    sellerRequestController.current = controller;
    setSellerLoading(true);
    setSellerLoadError("");
    getJSON<{ sellers: AdminSeller[] }>("/admin/sellers", controller.signal)
      .then((sellerFeed) => { if (!controller.signal.aborted) setSellers(sellerFeed.sellers); })
      .catch(() => { if (!controller.signal.aborted) setSellerLoadError("Unable to load seller applications."); })
      .finally(() => {
        if (sellerRequestController.current === controller) {
          sellerRequestPending.current = false;
          sellerRequestController.current = null;
        }
        if (!controller.signal.aborted) setSellerLoading(false);
      });
  }, []);

  const loadFinance = useCallback(() => {
    if (financeRequestPending.current) return;
    const controller = new AbortController();
    financeRequestPending.current = true;
    financeRequestController.current = controller;
    setFinanceLoading(true);
    setFinanceError("");
    getJSON<AdminFinanceOverview>("/admin/finance", controller.signal)
      .then((financeFeed) => { if (!controller.signal.aborted) setFinance(financeFeed); })
      .catch(() => { if (!controller.signal.aborted) setFinanceError("Unable to load finance records."); })
      .finally(() => {
        if (financeRequestController.current === controller) {
          financeRequestPending.current = false;
          financeRequestController.current = null;
        }
        if (!controller.signal.aborted) setFinanceLoading(false);
      });
  }, []);

  const loadAnalytics = useCallback(() => {
    if (analyticsRequestPending.current) return;
    const controller = new AbortController();
    analyticsRequestPending.current = true;
    analyticsRequestController.current = controller;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    getJSON<{ analytics: AdminAnalytics }>("/admin/analytics", controller.signal)
      .then((analyticsFeed) => { if (!controller.signal.aborted) setAnalytics(analyticsFeed.analytics); })
      .catch(() => { if (!controller.signal.aborted) setAnalyticsError("Unable to load marketplace analytics."); })
      .finally(() => {
        if (analyticsRequestController.current === controller) {
          analyticsRequestPending.current = false;
          analyticsRequestController.current = null;
        }
        if (!controller.signal.aborted) setAnalyticsLoading(false);
      });
  }, []);

  const loadReviews = useCallback(() => {
    if (reviewRequestPending.current) return;
    const controller = new AbortController();
    reviewRequestPending.current = true;
    reviewRequestController.current = controller;
    setReviewLoading(true);
    setReviewLoadError("");
    getJSON<{ reviews: AdminReview[] }>("/admin/reviews", controller.signal)
      .then((reviewFeed) => { if (!controller.signal.aborted) setData((current) => ({ ...current, reviews: reviewFeed.reviews })); })
      .catch(() => { if (!controller.signal.aborted) setReviewLoadError("Unable to load customer reviews."); })
      .finally(() => {
        if (reviewRequestController.current === controller) {
          reviewRequestPending.current = false;
          reviewRequestController.current = null;
        }
        if (!controller.signal.aborted) setReviewLoading(false);
      });
  }, []);

  useEffect(() => {
    return () => searchRequestController.current?.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadAccounts(controller.signal));
    return () => controller.abort();
  }, [loadAccounts]);

  useEffect(() => {
    loadProducts();
    return () => {
      productRequestController.current?.abort();
      productRequestPending.current = false;
      productRequestController.current = null;
    };
  }, [loadProducts]);

  useEffect(() => {
    loadSellers();
    return () => {
      sellerRequestController.current?.abort();
      sellerRequestPending.current = false;
      sellerRequestController.current = null;
    };
  }, [loadSellers]);

  useEffect(() => {
    loadFinance();
    return () => {
      financeRequestController.current?.abort();
      financeRequestPending.current = false;
      financeRequestController.current = null;
    };
  }, [loadFinance]);

  useEffect(() => {
    loadAnalytics();
    return () => {
      analyticsRequestController.current?.abort();
      analyticsRequestPending.current = false;
      analyticsRequestController.current = null;
    };
  }, [loadAnalytics]);

  useEffect(() => {
    loadReviews();
    return () => {
      reviewRequestController.current?.abort();
      reviewRequestPending.current = false;
      reviewRequestController.current = null;
    };
  }, [loadReviews]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) return loadAuditRecords(); });
    return () => {
      active = false;
      auditRequestController.current?.abort();
      auditRequestController.current = null;
    };
  }, [loadAuditRecords]);

  useEffect(() => {
    const controller = new AbortController();
    void loadOrders(controller.signal);
    void loadPromotions(controller.signal);
    return () => controller.abort();
  }, []);

  const overview = useMemo(() => adminOverview(data), [data]);
  const attentionProducts = data.products.filter((product) => !product.isPublished || product.stock === 0);
  const displayedSellers = activeSection === "applications" ? sellers.filter((seller) => seller.status === "pending") : sellers;
  const recordedCommissionCount = analytics?.commissions.paid ?? 0;

  async function loadOrders(signal?: AbortSignal) {
    setOrderLoading(true);
    setOrderError("");
    try {
      const { orders } = await getJSON<{ orders: AdminOrder[] }>("/admin/orders", signal);
      if (!signal?.aborted) setData((current) => ({ ...current, orders }));
    } catch {
      if (!signal?.aborted) setOrderError("Unable to load order records.");
    } finally {
      if (!signal?.aborted) setOrderLoading(false);
    }
  }

  async function loadPromotions(signal?: AbortSignal) {
    setPromotionLoading(true);
    setPromotionError("");
    try {
      const { promotions } = await getJSON<{ promotions: AdminPromotion[] }>("/admin/promotions", signal);
      if (!signal?.aborted) setData((current) => ({ ...current, promotions }));
    } catch {
      if (!signal?.aborted) setPromotionError("Unable to load promotion configurations.");
    } finally {
      if (!signal?.aborted) setPromotionLoading(false);
    }
  }

  function submitAdminSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = normalizeAdminSearchInput(searchQuery, searchLimit);
    setSearchError("");
    setHasSearched(true);
    if (!input) {
      searchRequestController.current?.abort();
      setSearchLoading(false);
      setSearchResults([]);
      setSearchError("Enter a search term.");
      return;
    }

    searchRequestController.current?.abort();
    const controller = new AbortController();
    const requestId = ++searchRequestId.current;
    searchRequestController.current = controller;
    setSearchLoading(true);
    setSearchResults([]);
    void getJSON<{ results: AdminSearchResult[] }>(adminSearchPath(input), controller.signal)
      .then(({ results }) => {
        if (!controller.signal.aborted && requestId === searchRequestId.current) setSearchResults(results);
      })
      .catch(() => {
        if (!controller.signal.aborted && requestId === searchRequestId.current) setSearchError("Unable to search marketplace records.");
      })
      .finally(() => {
        if (searchRequestController.current === controller) searchRequestController.current = null;
        if (!controller.signal.aborted && requestId === searchRequestId.current) setSearchLoading(false);
      });
  }

  function applyAuditFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filters = { action: auditAction, resourceType: auditResourceType, limit: auditLimit };
    setAppliedAuditFilters(filters);
    void loadAuditRecords(filters);
  }

  function resetAuditFilters() {
    const filters = {};
    setAuditAction("");
    setAuditResourceType("");
    setAuditLimit("");
    setAppliedAuditFilters(filters);
    void loadAuditRecords(filters);
  }

  async function updateReviewVisibility(change: VisibilityChange) {
    if (reviewMutationIds.current.has(change.reviewId)) return;
    reviewMutationIds.current.add(change.reviewId);
    setReviewError("");
    setFailedVisibilityChange(null);
    setUpdatingReviewIds((current) => new Set([...current, change.reviewId]));
    try {
      await patchJSON(`/admin/reviews/${change.reviewId}/visibility`, { isVisible: change.isVisible });
      setData((current) => ({ ...current, reviews: applyReviewVisibility(current.reviews, change.reviewId, change.isVisible) }));
    } catch (reason: unknown) {
      const message = reviewModerationError(reason);
      if (message) {
        setReviewError(message);
        setFailedVisibilityChange(change);
      }
    } finally {
      reviewMutationIds.current.delete(change.reviewId);
      setUpdatingReviewIds((current) => {
        const next = new Set(current);
        next.delete(change.reviewId);
        return next;
      });
    }
  }

  async function updateProductPublication(change: PublicationChange) {
    if (productMutationIds.current.has(change.productId)) return;
    productMutationIds.current.add(change.productId);
    setPublicationError("");
    setPublicationSuccess("");
    setUpdatingProductIds((current) => new Set([...current, change.productId]));
    try {
      const { product } = await patchJSON<{ product: AdminProduct }>(`/admin/products/${change.productId}/publication`, { isPublished: change.isPublished, expectedRevision: change.expectedRevision });
      setData((current) => ({ ...current, products: replacePublishedProduct(current.products, product) }));
      setPublicationSuccess("Product publication updated.");
    } catch (reason: unknown) {
      const message = productPublicationError(reason);
      if (message) setPublicationError(message);
    } finally {
      productMutationIds.current.delete(change.productId);
      setUpdatingProductIds((current) => {
        const next = new Set(current);
        next.delete(change.productId);
        return next;
      });
    }
  }

  async function updateProductModeration(change: ModerationChange) {
    if (productMutationIds.current.has(change.productId)) return;
    productMutationIds.current.add(change.productId);
    setPublicationError(""); setPublicationSuccess("");
    setUpdatingProductIds((current) => new Set([...current, change.productId]));
    try {
      const { product } = await patchJSON<{ product: AdminProduct }>(`/admin/products/${change.productId}/moderation`, { status: change.status, reason: change.reason || undefined, expectedRevision: change.expectedRevision });
      setData((current) => ({ ...current, products: replacePublishedProduct(current.products, product) }));
      setPublicationSuccess("Product moderation updated.");
    } catch (reason: unknown) { const message = productPublicationError(reason); if (message) setPublicationError(message); }
    finally { productMutationIds.current.delete(change.productId); setUpdatingProductIds((current) => { const next = new Set(current); next.delete(change.productId); return next; }); }
  }

  async function updateSellerStatus(change: SellerChange) {
    if (sellerMutationIds.current.has(change.sellerId)) return;
    sellerMutationIds.current.add(change.sellerId);
    setSellerFeedback((current) => {
      const { [change.sellerId]: _, ...remaining } = current;
      return remaining;
    });
    setUpdatingSellerIds((current) => new Set([...current, change.sellerId]));
    try {
      const { seller } = await patchJSON<{ seller: AdminSeller }>(`/admin/sellers/${change.sellerId}/status`, { action: change.action });
      setSellers((current) => replaceModeratedSeller(current, seller));
      setSellerFeedback((current) => ({ ...current, [change.sellerId]: { kind: "success", message: `Seller ${seller.status}.` } }));
    } catch (reason: unknown) {
      const message = sellerModerationError(reason);
      if (message) setSellerFeedback((current) => ({ ...current, [change.sellerId]: { kind: "error", message } }));
    } finally {
      sellerMutationIds.current.delete(change.sellerId);
      setUpdatingSellerIds((current) => {
        const next = new Set(current);
        next.delete(change.sellerId);
        return next;
      });
    }
  }

  async function reviewPayout(change: PayoutReviewChange) {
    if (payoutMutationIds.current.has(change.payout.id)) return;
    payoutMutationIds.current.add(change.payout.id); setFinanceFeedback(""); setUpdatingPayoutIds((current) => new Set([...current, change.payout.id]));
    try { const payout = await patchJSON<AdminFinancePayout>(`/admin/finance/payouts/${change.payout.id}/review`, { decision: change.decision, expectedStatus: "pending" }); setFinance((current) => current ? { ...current, payouts: current.payouts.map((item) => item.id === payout.id ? { ...item, ...payout } : item) } : current); setFinanceFeedback(`Payout request ${payout.status}. No money was transferred.`); }
    catch (reason) { setFinanceFeedback(reason instanceof Error ? reason.message : "Unable to review payout request."); }
    finally { payoutMutationIds.current.delete(change.payout.id); setUpdatingPayoutIds((current) => { const next = new Set(current); next.delete(change.payout.id); return next; }); }
  }

  function confirmAdminChange() {
    if (!confirmation) return;
    const confirmed = confirmation;
    void (async () => {
      if (confirmed.kind === "seller") await updateSellerStatus(confirmed.change);
      if (confirmed.kind === "publication") await updateProductPublication(confirmed.change);
      if (confirmed.kind === "moderation") {
        if (confirmed.change.status !== "approved" && !moderationReason.trim()) { setPublicationError("A moderation reason is required."); return; }
        await updateProductModeration({ ...confirmed.change, reason: moderationReason.trim() });
      }
      if (confirmed.kind === "visibility") await updateReviewVisibility(confirmed.change);
      if (confirmed.kind === "payout") await reviewPayout(confirmed.change);
      setConfirmation(null);
    })();
  }

  const confirmationPending = confirmation?.kind === "seller" ? updatingSellerIds.has(confirmation.change.sellerId) : confirmation?.kind === "publication" || confirmation?.kind === "moderation" ? updatingProductIds.has(confirmation.change.productId) : confirmation?.kind === "visibility" ? updatingReviewIds.has(confirmation.change.reviewId) : confirmation?.kind === "payout" ? updatingPayoutIds.has(confirmation.change.payout.id) : false;
  const confirmationCopy = confirmation?.kind === "seller"
    ? { title: `${confirmation.change.action[0].toUpperCase()}${confirmation.change.action.slice(1)} seller?`, description: `This changes the seller's marketplace status through the protected moderation service.`, confirmLabel: `Confirm ${confirmation.change.action}` }
    : confirmation?.kind === "publication"
      ? { title: `${confirmation.change.isPublished ? "Publish" : "Unpublish"} product?`, description: `This changes the product's public catalog visibility.`, confirmLabel: `Confirm ${confirmation.change.isPublished ? "publish" : "unpublish"}` }
      : confirmation?.kind === "moderation"
        ? { title: `${confirmation.change.status === "changes_requested" ? "Request changes" : confirmation.change.status[0].toUpperCase() + confirmation.change.status.slice(1)} product?`, description: "This records the protected moderation outcome and updates public visibility.", confirmLabel: `Confirm ${confirmation.change.status === "changes_requested" ? "request changes" : confirmation.change.status}` }
      : confirmation?.kind === "visibility"
        ? { title: `${confirmation.change.isVisible ? "Restore" : "Hide"} review?`, description: `This changes whether the customer review is visible in the marketplace.`, confirmLabel: `Confirm ${confirmation.change.isVisible ? "restore" : "hide"}` }
      : confirmation?.kind === "payout"
        ? { title: `${confirmation.change.decision === "approve" ? "Approve" : "Reject"} payout review request?`, description: "This records an internal review decision only. It does not execute, transfer, or settle money.", confirmLabel: `Confirm ${confirmation.change.decision}` }
        : null;

  function focusWorkspace(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    workspaceContentRef.current?.focus();
  }

  const logout = async () => {
    setLogoutState({ state: "pending" });
    try {
      await postJSON<void>("/auth/logout", {});
      router.replace("/");
    } catch (reason) {
      setLogoutState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to sign out. Please try again." });
    }
  };

  return <main className="admin-workspace" data-admin-section={activeSection} data-admin-product-create={productCreateKind ?? undefined} data-admin-product-operation={productOperation ?? undefined}>
    <a className="admin-skip-link" href="#admin-workspace-content" onClick={focusWorkspace}>Skip to workspace content</a>
    <aside className="admin-sidebar admin-sidebar-premium" aria-label="Administration workspace">
      <Link className="admin-workspace-brand" href="/" aria-label="NexaMart storefront"><BrandLogo monogram className="admin-brand-logo" /></Link>
      <div className="admin-sidebar-context"><strong>NexaMart Admin</strong><small>Marketplace administration</small></div>
      <nav className="admin-workspace-nav" aria-label="Administration sections">
        {adminControlRoomOrder.map((section) => {
          const item = adminSections.find((candidate) => candidate.section === section)!;
          const isActive = item.section === activeSection;
          return <div key={item.section} className="admin-nav-item"><Link href={`/admin/${item.section}`} aria-label={item.label} aria-current={isActive ? "page" : undefined} className={isActive ? "is-active admin-action-control" : "admin-action-control"}><AdminNavIcon symbol={item.icon} /><span>{item.railLabel ?? item.label}</span></Link>{item.section === "products" && isActive && <div className="admin-products-subnav" aria-label="Products workspace pages">{adminProductLinks.map((child) => {
            const isProductChildActive = pathname === child.href;
            return <Link key={child.href} href={child.href} aria-current={isProductChildActive ? "page" : undefined} className={isProductChildActive ? "is-active" : undefined}>{child.label}</Link>;
          })}</div>}</div>;
        })}
      </nav>
      <div className="admin-sidebar-session" aria-live="polite">
        <div className="admin-sidebar-profile"><span className="admin-sidebar-avatar" aria-hidden="true">A</span><div><strong>Administrator</strong><small>Protected workspace</small></div></div>
        <button className="admin-sidebar-logout" type="button" onClick={() => void logout()} disabled={logoutState.state === "pending"}>{logoutState.state === "pending" ? "Signing out…" : "Sign out"}</button>
        {logoutState.state === "error" && <div className="admin-sidebar-logout-error" role="alert"><span>{logoutState.message}</span><button className="admin-sidebar-logout-retry" type="button" onClick={() => void logout()}>Try signing out again</button></div>}
      </div>
      <Link className="admin-sidebar-return admin-action-control" href="/">View storefront <span aria-hidden="true">↗</span></Link>
    </aside>
    <div className="admin-workspace-content" id="admin-workspace-content" ref={workspaceContentRef} tabIndex={-1}>
      <header className="admin-utility-bar admin-command-bar"><div className="admin-command-context"><nav className="admin-breadcrumb" aria-label="Breadcrumb"><Link href="/">NexaMart</Link><span aria-hidden="true">/</span><span aria-current="page">Administration</span></nav><span className="admin-command-scope">Monitor / operate</span></div><Link className="admin-command-link admin-action-control" href="/admin/audit">Audit trail <span aria-hidden="true">→</span></Link></header>
      {activeSection === "overview" && <>
      <section className="admin-overview-briefing" aria-labelledby="admin-workspace-title">
        <section className="admin-context-header" aria-labelledby="admin-workspace-title"><div><p className="eyebrow">Catalog governance</p><h1 id="admin-workspace-title">Keep NexaMart’s catalog healthy and compliant.</h1><p>Review content, manage taxonomy, and ensure a trusted marketplace.</p></div><Link className="admin-context-link admin-action-control" href="/admin/feedback">Open feedback queue <span aria-hidden="true">→</span></Link></section>
        <div className="admin-overview-command-deck" aria-label="Governance queues" aria-live="polite" aria-busy={sellerLoading || productLoading || financeLoading || auditLoading}>
          <article><span>Seller Review</span><strong>{sellerLoading ? "—" : sellers.filter((seller) => seller.status === "pending").length}</strong><small>{sellerLoading ? "Loading applications" : sellerLoadError ? "Applications unavailable" : "awaiting moderation"}</small><Link className="admin-queue-action" href="/admin/applications">Review applications <span aria-hidden="true">→</span></Link></article>
          <article><span>Product Moderation</span><strong>{productLoading ? "—" : productError ? "!" : attentionProducts.length}</strong><small>{productLoading ? "Loading catalog" : productError ? "Catalog unavailable" : "records needing attention"}</small><Link className="admin-queue-action" href="/admin/products">Review products <span aria-hidden="true">→</span></Link></article>
          <article><span>Payout Review</span><strong>{financeLoading ? "—" : financeError ? "!" : finance ? finance.payouts.filter((payout) => payout.status === "pending").length : 0}</strong><small>{financeLoading ? "Loading review requests" : financeError ? "Review requests unavailable" : "requests awaiting review"}</small><Link className="admin-queue-action" href="/admin/finance">Open review queue <span aria-hidden="true">→</span></Link></article>
          <article><span>Admin Audit</span><strong>{auditLoading ? "—" : auditError ? "!" : data.auditRecords.length}</strong><small>{auditLoading ? "Loading audit activity" : auditError ? "Audit activity unavailable" : "recent records"}</small><Link className="admin-queue-action" href="/admin/audit">View audit trail <span aria-hidden="true">→</span></Link></article>
        </div>
      </section>
    <section className="admin-grid">
      <section className="admin-panel admin-moderation" aria-labelledby="moderation-heading">
        <div className="admin-panel-head"><div><p className="eyebrow">Moderation queue</p><h2 id="moderation-heading">Products needing attention</h2></div><span>{productLoading ? "Loading" : `${attentionProducts.length} queued`}</span></div>
        {productLoading ? <p className="admin-state">Loading catalog moderation…</p> : productError ? <div className="admin-empty" role="alert"><strong>Unable to load product records.</strong><p>Try loading the product records again.</p><button type="button" onClick={loadProducts} disabled={productLoading} aria-label="Retry product records">Try again</button></div> : attentionProducts.length ? <div className="admin-list">{attentionProducts.map((product) => <article className="admin-row" key={product.id}><div><strong>{product.name}</strong><small>Seller: {product.seller?.name ?? "Unassigned"}</small></div><span className={product.stock === 0 ? "admin-stock empty-stock" : "admin-stock"}>{product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}</span><span className={`admin-status ${product.isPublished ? "published" : "draft"}`}>{product.isPublished ? "Published" : "Draft"}</span></article>)}</div> : <div className="admin-empty"><strong>Nothing needs review.</strong><p>Unpublished and out-of-stock products appear here.</p></div>}
      </section>
      <aside className="admin-panel admin-health" aria-labelledby="health-heading"><p className="eyebrow">Attention queue</p><h2 id="health-heading">A clear next action.</h2><p>{productLoading || orderLoading ? "Loading current signals…" : productError || orderError ? "Awaiting real API data." : overview.unpublishedProducts ? `${overview.unpublishedProducts} product${overview.unpublishedProducts === 1 ? " is" : "s are"} awaiting publication review.` : overview.outOfStockProducts ? `${overview.outOfStockProducts} live product${overview.outOfStockProducts === 1 ? " is" : "s are"} unavailable.` : "No live activity available."}</p><Link className="admin-action-control" href="/admin/products">Open product oversight <span aria-hidden="true">→</span></Link></aside>
    </section>
    <section className="admin-grid admin-overview-secondary" aria-label="Marketplace governance queues">
      <section className="admin-panel admin-overview-sellers" aria-labelledby="overview-sellers-heading"><div className="admin-panel-head"><div><p className="eyebrow">Seller applications</p><h2 id="overview-sellers-heading">Pending seller applications</h2></div><Link className="admin-action-control" href="/admin/applications">View all</Link></div>{sellerLoading ? <p className="admin-state">Loading seller applications…</p> : sellerLoadError ? <p className="admin-state">Seller applications are unavailable.</p> : sellers.filter((seller) => seller.status === "pending").slice(0, 5).length ? <div className="admin-list">{sellers.filter((seller) => seller.status === "pending").slice(0, 5).map((seller) => <article className="admin-row" key={seller.id}><div><strong>{seller.storeName}</strong><small>{seller.storeSlug}</small></div><span className="admin-status seller-pending">pending</span><Link className="admin-action-control" href="/admin/applications">Review</Link></article>)}</div> : <div className="admin-empty"><strong>No pending seller applications.</strong></div>}</section>
      <section className="admin-panel admin-overview-audit" aria-labelledby="overview-audit-heading"><div className="admin-panel-head"><div><p className="eyebrow">Administrative history</p><h2 id="overview-audit-heading">Recent Admin Audit</h2></div><Link href="/admin/audit">View all</Link></div>{auditLoading ? <p className="admin-state">Loading audit activity…</p> : auditError ? <p className="admin-state">Audit activity is unavailable.</p> : data.auditRecords.length ? <div className="admin-overview-audit-table-wrap" role="region" aria-label="Recent administrative activity" tabIndex={0}><table className="admin-overview-audit-table"><thead><tr><th scope="col">Time</th><th scope="col">Admin</th><th scope="col">Action</th><th scope="col">Details</th></tr></thead><tbody>{data.auditRecords.slice(0, 5).map((record) => <tr key={record.id}><td><time dateTime={record.createdAt}>{timestampFormat.format(new Date(record.createdAt))}</time></td><td>{record.actorId}</td><td>{record.action}</td><td><code>{auditMetadataText(record.metadata)}</code></td></tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No audit records yet.</strong></div>}</section>
    </section>
    <section className="admin-panel admin-global-search" aria-labelledby="admin-search-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Marketplace records</p><h2 id="admin-search-heading">Global search</h2><p className="admin-global-search-note">Search seller, product, and order records through the protected administration service.</p></div></div>
      <form className="admin-global-search-form" onSubmit={submitAdminSearch}>
        <div><label htmlFor="admin-global-search">Search marketplace records</label><input id="admin-global-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} aria-describedby="admin-global-search-help" autoComplete="off" /></div>
        <div><label htmlFor="admin-global-search-limit">Result limit</label><select id="admin-global-search-limit" value={searchLimit} onChange={(event) => setSearchLimit(event.target.value)}><option value="10">10</option><option value="25">25</option></select></div>
        <button type="submit" disabled={searchLoading}>{searchLoading ? "Searching…" : "Search"}</button>
        <p id="admin-global-search-help">Enter a seller, product, or order term. Results are limited to 10 by default.</p>
      </form>
      {searchLoading ? <p className="admin-search-state" role="status" aria-live="polite">Searching marketplace records…</p> : searchError ? <p className="admin-search-state error" role="alert">{searchError}</p> : hasSearched && !searchResults.length ? <p className="admin-search-state" role="status" aria-live="polite">No records match “{searchQuery.trim()}”.</p> : searchResults.length ? <div className="admin-search-results" role="list" aria-label="Search results">{searchResults.map((result) => <article role="listitem" key={`${result.type}-${result.id}`}><span className="admin-search-result-type">{result.type}</span>{result.type === "seller" ? <div><strong>{result.storeName}</strong><small>{result.name} · {result.status}</small><Link href="/admin/sellers" aria-label={`Open seller moderation for ${result.storeName}`}>Open seller moderation</Link></div> : result.type === "product" ? <div><strong>{result.name}</strong><small>{result.slug} · {result.isPublished ? "Published" : "Unpublished"}</small><Link href="/admin/products" aria-label={`Open product oversight for ${result.name}`}>Open product oversight</Link></div> : <div><strong>{result.reference}</strong><small>{result.customerName} · {result.status}</small><Link href="/admin/orders" aria-label={`Open order oversight for ${result.reference}`}>Open order oversight</Link></div>}</article>)}</div> : null}
    </section>
    </>}
    {(activeSection === "applications" || activeSection === "sellers") && <div className="admin-operations-workspace"><section className="admin-panel admin-seller-moderation" aria-labelledby="seller-moderation-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">{activeSection === "applications" ? "Seller applications" : "Marketplace directory"}</p><h2 id="seller-moderation-heading">{activeSection === "applications" ? "Pending seller applications" : "Sellers"}</h2><p className="admin-seller-moderation-note">{activeSection === "applications" ? "Review pending seller applications through the protected moderation service." : "Review seller profiles and use the protected moderation actions when a status change is required."}</p></div><span>{sellerLoading ? "Loading" : `${displayedSellers.length} total`}</span></div>
      {sellerLoading ? <p className="admin-state">Loading seller applications…</p> : sellerLoadError ? <div className="admin-empty" role="alert"><strong>Unable to load seller applications.</strong><p>Try loading the seller applications again.</p><button type="button" onClick={loadSellers} disabled={sellerLoading} aria-label="Retry seller applications">Try again</button></div> : displayedSellers.length ? <div className="admin-list admin-operations-table">{displayedSellers.map((seller) => {
        const isUpdating = updatingSellerIds.has(seller.id);
        const feedback = sellerFeedback[seller.id];
        const actions = sellerModerationActions(seller.status);
        return <article className="admin-seller-record" key={seller.id}>
          <div><strong>{seller.storeName}</strong><small>{seller.storeSlug}</small>{seller.description && <small>{seller.description}</small>}</div>
          <time dateTime={seller.createdAt}>Applied {dateFormat.format(new Date(seller.createdAt))}</time>
          <span className={`admin-status seller-${seller.status}`}>{seller.status}</span>
          <div className="admin-seller-actions" aria-label={`Moderation actions for ${seller.storeName}`}>{actions.map((action) => <button className="admin-seller-action" type="button" key={action} disabled={isUpdating} aria-label={`${action} seller ${seller.storeName}`} onClick={() => setConfirmation({ kind: "seller", change: { sellerId: seller.id, action } })}>{isUpdating ? "Saving…" : action}</button>)}</div>
          {feedback && (feedback.kind === "error" ? <p className="admin-seller-feedback error" role="alert">{feedback.message}</p> : <p className="admin-seller-feedback success" role="status">{feedback.message}</p>)}
        </article>;
      })}</div> : <div className="admin-empty"><strong>No seller applications are available for moderation.</strong><p>Seller applications will appear here when submitted.</p></div>}
    </section></div>}
    {activeSection === "products" && productOperation === "add" && <section className="admin-panel admin-product-intake" aria-labelledby="product-intake-heading"><div className="admin-panel-head"><div><p className="eyebrow">Seller-owned catalog</p><h2 id="product-intake-heading">Seller catalog guidance</h2><p>Products remain seller-owned. This administration workspace governs taxonomy, moderation, and publication rather than creating inventory under an administrator account.</p></div><Link className="admin-context-link" href="/admin/products">Back to products</Link></div><div className="admin-empty"><strong>Use the seller product workflow for product creation.</strong><p>Once a seller submits a draft with approved category, subcategory, and brand values, it appears here for catalog oversight and publication review.</p></div></section>}
    {activeSection === "products" && !productOperation && <div className="admin-catalog-governance"><section className="admin-panel admin-products-actions" aria-labelledby="products-actions-heading"><div className="admin-panel-head"><div><p className="eyebrow">Catalog setup</p><h2 id="products-actions-heading">Products workspace</h2><p>Create and maintain the canonical vocabulary that keeps the marketplace catalog consistent.</p></div></div><div className="admin-products-action-grid"><Link href="/admin/products/categories/create"><strong>Create category</strong><span>Define a top-level catalog department.</span></Link><Link href="/admin/products/subcategories/create"><strong>Create subcategory</strong><span>Add a category-specific refinement.</span></Link><Link href="/admin/products/brands/create"><strong>Create brand</strong><span>Add an approved manufacturer or label.</span></Link><Link href="/admin/products/add"><strong>Seller catalog guidance</strong><span>Open guidance for the seller-owned catalog workflow.</span></Link></div></section>
    <section className="admin-panel admin-product-oversight" aria-labelledby="product-oversight-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Catalog records</p><h2 id="product-oversight-heading">Product oversight</h2><p className="admin-product-oversight-note">Read-only catalog records with category, seller, store, and publication context.</p></div><span>{productLoading ? "Loading" : `${data.products.length} total`}</span></div>
      {(publicationError || publicationSuccess) && <p className={publicationError ? "admin-publication-feedback error" : "admin-publication-feedback success"} role={publicationError ? "alert" : "status"}>{publicationError || publicationSuccess}</p>}
      {productLoading ? <p className="admin-state">Loading product records…</p> : productError ? <div className="admin-empty" role="alert"><strong>Unable to load product records.</strong><p>Try loading the product records again.</p><button type="button" onClick={loadProducts} disabled={productLoading} aria-label="Retry product records">Try again</button></div> : data.products.length ? <div className="admin-list admin-governance-table">{data.products.map((product) => {
        const isPublished = product.isPublished;
        const isUpdating = updatingProductIds.has(product.id);
        const galleryImages = (product.galleryImages ?? []).flatMap((image) => {
          const imageUrl = safeReviewImageUrl(image.imageUrl);
          return imageUrl ? [{ ...image, imageUrl }] : [];
        });
        return <article className="admin-product-record" key={product.id}>
          <div><strong>{product.name}</strong><small>{product.brand ? `${product.brand} · ` : ""}{product.slug} · {moneyFormat.format(product.price)} · {product.stock} in stock</small><small>Category: {product.category?.name ?? "Uncategorized"} · Seller: {product.seller?.name ?? "Unassigned"} · Store: {product.seller?.storeName ?? "No store profile"}</small><small>Description: {product.description ?? "No description provided."}</small><small>Colors: {product.colors?.length ? product.colors.join(", ") : "No colors specified"}</small><div aria-label={`Gallery images for ${product.name}`}><small><strong>Gallery images</strong></small>{galleryImages.length ? galleryImages.map((image) => <span key={`${image.sortOrder}-${image.imageUrl}`}><small>Image {image.sortOrder + 1}</small><Image unoptimized src={image.imageUrl} alt={image.altText ?? `${product.name} gallery image`} width={48} height={48} /></span>) : <small>No gallery images provided.</small>}</div><div aria-label={`Variants for ${product.name}`}><small><strong>Variants</strong></small>{product.variants?.length ? <ul>{product.variants.map((variant) => <li key={variant.sku}><small>SKU: {variant.sku} · {Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(" · ")} · {moneyFormat.format(variant.price)} · {variant.stock} in stock</small></li>)}</ul> : <small>No variants provided.</small>}</div></div>
          <time dateTime={product.updatedAt}>Updated {dateFormat.format(new Date(product.updatedAt))}</time>
          <span className={`admin-status ${product.isPublished ? "published" : "draft"}`}>{product.moderationStatus?.replaceAll("_", " ") ?? (product.isPublished ? "Published" : "Unpublished")}</span>{product.moderationReason && <small>Corrective guidance: {product.moderationReason}</small>}
          <button className="admin-publication-action" type="button" disabled={isUpdating || !product.expectedRevision} aria-label={`${isPublished ? "Unpublish" : "Publish"} ${product.name}`} onClick={() => { if (product.expectedRevision) setConfirmation({ kind: "publication", change: { productId: product.id, isPublished: !isPublished, expectedRevision: product.expectedRevision } }); }}>{isUpdating ? "Saving…" : isPublished ? "Unpublish" : "Publish"}</button>
          <div><button type="button" disabled={isUpdating || !product.expectedRevision} onClick={() => { setModerationReason(""); setConfirmation({ kind: "moderation", change: { productId: product.id, status: "approved", reason: "", expectedRevision: product.expectedRevision } }); }}>Approve</button><button type="button" disabled={isUpdating || !product.expectedRevision} onClick={() => { setModerationReason(""); setConfirmation({ kind: "moderation", change: { productId: product.id, status: "changes_requested", reason: "", expectedRevision: product.expectedRevision } }); }}>Request changes</button><button type="button" disabled={isUpdating || !product.expectedRevision} onClick={() => { setModerationReason(""); setConfirmation({ kind: "moderation", change: { productId: product.id, status: "rejected", reason: "", expectedRevision: product.expectedRevision } }); }}>Reject</button></div>
        </article>;
      })}</div> : <div className="admin-empty"><strong>No products are available for oversight.</strong><p>Products will appear here when sellers add them to the catalog.</p></div>}
    </section></div>}
    {activeSection === "finance" && <div className="admin-operations-workspace"><section className="admin-panel admin-finance" aria-labelledby="finance-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Marketplace finance</p><h2 id="finance-heading">Finance oversight</h2><p className="admin-finance-note">Review records only. Approval does not execute, transfer, or settle money.</p></div></div>
      {financeLoading ? <p className="admin-state">Loading finance records…</p> : financeError ? <div className="admin-empty" role="alert"><strong>Unable to load finance records.</strong><p>Try loading the finance records again.</p><button type="button" onClick={loadFinance} disabled={financeLoading} aria-label="Retry finance records">Try again</button></div> : finance ? <>
        <div className="admin-finance-summary" aria-label="Finance summary">
          <article><span>Gross amount</span><strong>{finance.summary.grossAmount}</strong></article>
          <article><span>Platform commission</span><strong>{finance.summary.commissionAmount}</strong></article>
          <article><span>Net seller amount</span><strong>{finance.summary.netAmount}</strong></article>
          <article><span>Accrued net</span><strong>{finance.summary.accruedNetAmount}</strong></article>
          <article><span>Eligible net</span><strong>{finance.summary.eligibleNetAmount}</strong></article>
          <article><span>Recorded net</span><strong>{finance.summary.paidNetAmount}</strong></article>
        </div>
        <div className="admin-finance-records">
          <div><h3>Commission records</h3>{finance.commissions.length ? <div className="admin-list">{finance.commissions.map((commission) => <article className="admin-finance-record" key={commission.id}><div><strong>{commission.orderReference}</strong><small>Seller: {commission.sellerId} · Gross: {commission.grossAmount} · Commission: {commission.commissionAmount} · Net: {commission.netAmount} · Rate: {commission.ratePercent}</small></div><time dateTime={commission.createdAt}>{dateFormat.format(new Date(commission.createdAt))}</time><span className="admin-status">{adminFinancialStatus(commission.status)}</span></article>)}</div> : <p className="admin-state">No commission records yet.</p>}</div>
          <div><h3>Payout review queue</h3>{finance.payouts.length ? <div className="admin-list">{finance.payouts.map((payout) => <article className="admin-finance-record" key={payout.id}><div><strong>{payout.reference}</strong><small>Seller: {payout.sellerId} · Requested amount: {payout.amount}</small></div><span className="admin-status">{payout.status === "pending" ? "requested" : payout.status}</span>{payout.status === "pending" && <div><button type="button" disabled={updatingPayoutIds.has(payout.id)} onClick={() => setConfirmation({ kind: "payout", change: { payout, decision: "approve" } })}>Approve review</button><button type="button" disabled={updatingPayoutIds.has(payout.id)} onClick={() => setConfirmation({ kind: "payout", change: { payout, decision: "reject" } })}>Reject review</button></div>}</article>)}</div> : <p className="admin-state">No payout review requests yet.</p>}</div>
        </div>
        {financeFeedback && <p className="admin-state" role="status">{financeFeedback} <button type="button" onClick={loadFinance} aria-label="Retry finance records">Refresh</button></p>}
      </> : <div className="admin-empty"><strong>Finance information is unavailable.</strong><p>Refresh the page to try again.</p></div>}
    </section></div>}
    {activeSection === "analytics" && <div className="admin-operations-workspace"><section className="admin-panel admin-analytics" aria-labelledby="analytics-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Marketplace aggregates</p><h2 id="analytics-heading">Marketplace analytics</h2><p className="admin-analytics-note">Read-only aggregate records. Values are bounded as labeled.</p></div></div>
      {analyticsLoading ? <p className="admin-state">Loading marketplace analytics…</p> : analyticsError ? <div className="admin-empty" role="alert"><strong>Unable to load marketplace analytics.</strong><p>Try loading the marketplace analytics again.</p><button type="button" onClick={loadAnalytics} disabled={analyticsLoading} aria-label="Retry marketplace analytics">Try again</button></div> : analytics ? analytics.accounts.total === 0 && analytics.catalog.products === 0 && analytics.orders.orders === 0 && analytics.reviews.total === 0 && analytics.commissions.records === 0 ? <div className="admin-empty"><strong>No marketplace activity is recorded within these bounds.</strong></div> : <>
        <div className="admin-analytics-scope" aria-label="Aggregate bounds"><span>Accounts: {analytics.bounds.accounts}</span><span>Sellers: {analytics.bounds.sellers}</span><span>Catalog: {analytics.bounds.catalog}</span><span>Orders: {analytics.bounds.orders}</span><span>Reviews: {analytics.bounds.reviews}</span><span>Commissions: {analytics.bounds.commissions}</span></div>
        <div className="admin-analytics-grid">
          <article><h3>Accounts</h3><p>Total <strong>{analytics.accounts.total}</strong></p><small>Customers {analytics.accounts.customers} · Sellers {analytics.accounts.sellers} · Admins {analytics.accounts.admins}</small></article>
          <article><h3>Seller statuses</h3><p>Total <strong>{analytics.sellers.total}</strong></p><small>Pending {analytics.sellers.pending} · Approved {analytics.sellers.approved} · Rejected {analytics.sellers.rejected} · Suspended {analytics.sellers.suspended} · Active {analytics.sellers.active}</small></article>
          <article><h3>Catalog</h3><p>Products <strong>{analytics.catalog.products}</strong></p><small>Categories {analytics.catalog.categories} · Published {analytics.catalog.publishedProducts} · Draft {analytics.catalog.draftProducts} · Stock {analytics.catalog.totalStock} · Out of stock {analytics.catalog.outOfStockProducts}</small></article>
          <article><h3>Orders</h3><p>Orders <strong>{analytics.orders.orders}</strong></p><small>Order lines {analytics.orders.orderLines} · Units ordered {analytics.orders.unitsOrdered} · Gross total {analytics.orders.grossOrderTotal}</small></article>
          <article><h3>Reviews</h3><p>Total <strong>{analytics.reviews.total}</strong></p><small>Visible {analytics.reviews.visible} · Hidden {analytics.reviews.hidden}</small></article>
          <article><h3>Commissions</h3><p>Records <strong>{analytics.commissions.records}</strong></p><small>Gross {analytics.commissions.grossAmount} · Commission {analytics.commissions.commissionAmount} · Net {analytics.commissions.netAmount} · Accrued {analytics.commissions.accrued} · Eligible {analytics.commissions.eligible} · Recorded {recordedCommissionCount}</small></article>
        </div>
        <div className="admin-analytics-fulfillment"><h3>Fulfillment status counts</h3><div>{fulfillmentStatuses.map((status) => <article key={status}><span>{status}</span><strong>{analytics.orders.fulfillment[status]}</strong></article>)}</div></div>
      </> : <div className="admin-empty"><strong>Marketplace analytics are unavailable.</strong><p>Refresh the page to try again.</p></div>}
    </section></div>}
    {(activeSection === "taxonomy" || (activeSection === "products" && !!productCreateKind)) && <div className="admin-catalog-governance admin-taxonomy-route"><AdminTaxonomyManagement createKind={productCreateKind} /></div>}
    {activeSection === "promotions" && <div className="admin-operations-workspace"><section className="admin-panel admin-promotion-oversight" aria-labelledby="promotion-oversight-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Promotion records</p><h2 id="promotion-oversight-heading">Promotion oversight</h2><p className="admin-promotion-oversight-note">Read-only promotion records. Product flash offers are server-priced; legacy order-scope records are not price-applicable.</p></div><span>{promotionLoading ? "Loading" : `${data.promotions.length} total`}</span></div>
      {promotionLoading ? <p className="admin-state">Loading promotion configurations…</p> : promotionError ? <div className="admin-empty" role="alert"><strong>Unable to load promotion configurations.</strong><p>Try loading the promotion configurations again.</p><button className="admin-promotion-retry" type="button" onClick={() => void loadPromotions()}>Try again</button></div> : data.promotions.length ? <div className="admin-list admin-operations-table">{data.promotions.map((promotion) => <article className="admin-promotion-record" key={promotion.id}>
        <div><strong>{promotion.name}</strong><small>{promotion.scope === "order" ? "Legacy order-scope record — not price-applicable" : `Product flash offer · Product: ${promotion.product.name ?? "Selected product"}`} · Seller: {promotion.seller.name}</small><small>Discount: {promotion.discountPercent}% · Schedule: <time dateTime={promotion.startsAt}>{timestampFormat.format(new Date(promotion.startsAt))}</time> to <time dateTime={promotion.endsAt}>{timestampFormat.format(new Date(promotion.endsAt))}</time></small></div>
        <time dateTime={promotion.createdAt}>Created {timestampFormat.format(new Date(promotion.createdAt))}</time>
      </article>)}</div> : <div className="admin-empty"><strong>No promotion configurations are available for oversight.</strong><p>Promotion configurations will appear here when sellers create them.</p></div>}
    </section></div>}
    {activeSection === "feedback" && <div className="admin-operations-workspace"><section className="admin-panel admin-reviews" id="reviews" aria-labelledby="reviews-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Review moderation</p><h2 id="reviews-heading">Customer reviews</h2></div><span>{reviewLoading ? "Loading" : `${data.reviews.length} total`}</span></div>
      {reviewError && <div className="admin-review-error" role="alert"><span>{reviewError}</span>{failedVisibilityChange && <button type="button" onClick={() => setConfirmation({ kind: "visibility", change: failedVisibilityChange })}>Try again</button>}</div>}
      {reviewLoading ? <p className="admin-state">Loading customer reviews…</p> : reviewLoadError ? <div className="admin-empty" role="alert"><strong>Unable to load customer reviews.</strong><p>Try loading the customer reviews again.</p><button type="button" onClick={loadReviews} disabled={reviewLoading} aria-label="Retry customer reviews">Try again</button></div> : data.reviews.length ? <div className="admin-list admin-operations-table">{data.reviews.map((review) => {
        const targetVisibility = !review.isVisible;
        const isUpdating = updatingReviewIds.has(review.id);
        return <article className="admin-review" key={review.id}>
          <div className="admin-review-copy"><strong>{review.product.name}</strong><small>{review.customer.name} · {review.rating}/5 · <time dateTime={review.createdAt}>{dateFormat.format(new Date(review.createdAt))}</time></small>{review.title && <b>{review.title}</b>}{review.body && <p>{review.body}</p>}</div>
          <span className={`admin-status ${review.isVisible ? "visible" : "hidden"}`}>{review.isVisible ? "Visible" : "Hidden"}</span>
          <button className="admin-review-action" type="button" disabled={isUpdating} onClick={() => setConfirmation({ kind: "visibility", change: { reviewId: review.id, isVisible: targetVisibility } })}>{isUpdating ? "Saving…" : review.isVisible ? "Hide" : "Restore"}</button>
        </article>;
      })}</div> : <div className="admin-empty"><strong>No customer reviews yet.</strong><p>Reviews will appear here when customers share feedback.</p></div>}
    </section></div>}
    {activeSection === "audit" && <div className="admin-operations-workspace"><section className="admin-panel admin-audit" aria-labelledby="audit-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Administrative history</p><h2 id="audit-heading">Audit trail</h2></div><span>{auditLoading ? "Loading" : `${data.auditRecords.length} records`}</span></div>
      <form className="admin-audit-filters" onSubmit={applyAuditFilters} aria-label="Filter audit records">
        <div><label htmlFor="audit-action">Action</label><input id="audit-action" type="text" value={auditAction} onChange={(event) => setAuditAction(event.target.value)} placeholder="e.g. product.publish" /></div>
        <div><label htmlFor="audit-resource-type">Resource type</label><input id="audit-resource-type" type="text" value={auditResourceType} onChange={(event) => setAuditResourceType(event.target.value)} placeholder="e.g. product" /></div>
        <div><label htmlFor="audit-limit">Limit</label><select id="audit-limit" value={auditLimit} onChange={(event) => setAuditLimit(event.target.value)}><option value="">Server default</option><option value="1">1</option><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></div>
        <div className="admin-audit-filter-actions"><button type="submit">Apply filters</button><button type="button" onClick={resetAuditFilters}>Reset</button></div>
      </form>
          {auditLoading ? <p className="admin-state">Loading audit records…</p> : auditError ? <div className="admin-empty" role="alert"><strong>Unable to load audit records.</strong><p>Try loading the audit records again.</p><button className="admin-audit-retry" type="button" onClick={() => void loadAuditRecords(appliedAuditFilters)}>Try again</button></div> : data.auditRecords.length ? <div className="admin-list admin-operations-table">{data.auditRecords.map((record) => <article className="admin-audit-record" key={record.id}><div><strong>{record.action}</strong><small>{record.resourceType} · {record.resourceId}</small><code>{auditMetadataText(record.metadata)}</code></div><time dateTime={record.createdAt}>{timestampFormat.format(new Date(record.createdAt))}</time></article>)}</div> : <div className="admin-empty"><strong>No audit records match the selected filters.</strong><p>Try changing or resetting the filters.</p></div>}
    </section></div>}
    {activeSection === "orders" && <div className="admin-operations-workspace"><section className="admin-panel admin-order-oversight" id="orders" aria-labelledby="order-oversight-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Order records</p><h2 id="order-oversight-heading">Order oversight</h2><p className="admin-order-oversight-note">Read-only order snapshots. Payment and delivery changes are not available here.</p></div><span>{orderLoading ? "Loading" : `${data.orders.length} total`}</span></div>
          {orderLoading ? <p className="admin-state">Loading order records…</p> : orderError ? <div className="admin-empty" role="alert"><strong>Unable to load order records.</strong><p>Try loading the order records again.</p><button className="admin-order-retry" type="button" onClick={() => void loadOrders()} aria-label="Retry loading order records">Try again</button></div> : data.orders.length ? <div className="admin-list admin-operations-table">{data.orders.map((order) => <article className="admin-order-record" key={order.id}>
        <div className="admin-order-summary"><strong>{order.reference}</strong><small>Customer: {order.customer.name} · Created <time dateTime={order.createdAt}>{timestampFormat.format(new Date(order.createdAt))}</time></small><small>Order status: {order.status} · Payment: {order.paymentStatus} · Total: {moneyFormat.format(order.total)}</small></div>
        <details className="admin-order-detail"><summary aria-label={`Show order-line details for ${order.reference}`}>Order-line details</summary><div className="admin-order-items" aria-label={`Items for ${order.reference}`}>{order.items.map((item) => <article className="admin-order-item" key={item.id}><div><strong>{item.product.name}</strong><small>Seller: {item.seller.name ?? "Unassigned"} · Quantity: {item.quantity} · Unit price: {moneyFormat.format(item.unitPrice)}</small>{item.variant && <small>SKU: {item.variant?.sku} · {Object.entries(item.variant.options).map(([name, value]) => `${name}: ${value}`).join(" · ")}</small>}</div><span className="admin-status">{item.fulfillmentStatus}</span></article>)}</div></details>
          </article>)}</div> : <div className="admin-empty"><strong>No orders are available for oversight.</strong><p>Orders will appear here after customers check out.</p></div>}
    </section></div>}
    {activeSection === "accounts" && <div className="admin-operations-workspace"><section className="admin-panel admin-accounts" aria-labelledby="accounts-heading">
      <div className="admin-panel-head"><div><p className="eyebrow">Account directory</p><h2 id="accounts-heading">Account oversight</h2><p className="admin-account-note">Read-only account directory. Seller store and status appear when available.</p></div><span>{accountLoading ? "Loading" : `${data.accounts.length} shown`}</span></div>
      <div className="admin-account-controls"><label htmlFor="account-limit">Accounts to show</label><select id="account-limit" value={accountLimit} onChange={(event) => setAccountLimit(event.target.value)}><option value="1">1</option><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></div>
          {accountLoading ? <p className="admin-state">Loading account records…</p> : accountError ? <div className="admin-empty" role="alert"><strong>Unable to load account records.</strong><p>Try loading the account records again.</p><button className="admin-account-retry" type="button" onClick={() => void loadAccounts()}>Try again</button></div> : data.accounts.length ? <div className="admin-list admin-operations-table">{data.accounts.map((account) => <article className="admin-account" key={account.id}><div><strong>{account.name}</strong><small>{account.email}</small>{account.seller && <small>Store: {account.seller?.storeName} · Status: {account.seller.status}</small>}</div><time dateTime={account.createdAt}>Joined {dateFormat.format(new Date(account.createdAt))}</time><span className={`admin-role role-${account.role}`}>{account.role}</span></article>)}</div> : <div className="admin-empty"><strong>No accounts are available for oversight.</strong><p>Registered customers, sellers, and administrators appear here.</p></div>}
    </section></div>}
    </div>
    {confirmation && confirmationCopy && <ConfirmationDialog title={confirmationCopy.title} description={confirmationCopy.description} confirmLabel={confirmationCopy.confirmLabel} pending={confirmationPending} onCancel={() => setConfirmation(null)} onConfirm={confirmAdminChange} >{confirmation.kind === "moderation" && <label>Moderation reason<textarea value={moderationReason} onChange={(event) => setModerationReason(event.target.value)} required={confirmation.change.status !== "approved"} disabled={confirmationPending} /></label>}</ConfirmationDialog>}
  </main>;
}
