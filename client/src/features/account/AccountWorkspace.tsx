"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { deleteJSON, getJSON, postJSON } from "@/lib/api";
import { ApiError, patchJSON } from "@/lib/api";
import { productImageSource } from "@/features/catalog/product-presentation";
import { BrandLogo } from "@/components/BrandLogo";
import styles from "./AccountWorkspace.module.css";
import { customerOrderItemSummary, customerTrackingEmptyMessage, customerTrackingErrorMessage, customerTrackingTimelineEvents } from "./customer-order.utils";
import { buildAddressUpdate, validateAddressUpdate, type AddressEditFields } from "./address-editing";
import type { Account, CustomerOrder, CustomerOrderTracking, CustomerReviewEligibility, ShippingAddress, WishlistItem } from "@/types/account";

type TrackingState = { state: "loading" } | { state: "loaded"; order: CustomerOrderTracking } | { state: "error"; message: string };
type ReviewState = { state: "loading" } | { state: "loaded"; items: CustomerReviewEligibility[] } | { state: "error" };
type ReviewSubmissionState = { state: "saving" } | { state: "success" } | { state: "error"; message: string };
type WishlistState = { state: "loading" } | { state: "loaded" } | { state: "error"; message: string };
type WishlistRemovalState = { state: "removing" } | { state: "error"; message: string };
type AddressEditState = { state: "saving" } | { state: "success" } | { state: "error"; message: string };
type AddressDefaultState = { state: "saving" } | { state: "success" } | { state: "error"; message: string };
type AddressRemovalState = { state: "confirming" } | { state: "removing" } | { state: "success" } | { state: "error"; message: string };
type OrdersState = { state: "loading" } | { state: "loaded"; items: CustomerOrder[] } | { state: "error"; message: string };
type AddressesState = { state: "loading" } | { state: "loaded"; items: ShippingAddress[] } | { state: "error"; message: string };
type LogoutState = { state: "idle" } | { state: "pending" } | { state: "error"; message: string };
type AccountResolutionState = { state: "loading" } | { state: "authenticated" } | { state: "signed-out" } | { state: "error"; message: string };

function WishlistMedia({ item }: { item: WishlistItem }) {
  const source = productImageSource(item.image, item.id);
  const [failed, setFailed] = useState(false);

  if (!source || failed) return <div className="wishlist-image-fallback" role="img" aria-label={`${item.name} product image unavailable`}>NM</div>;
  return <img className="wishlist-image" src={source} alt={item.name} loading="lazy" onError={() => setFailed(true)} />;
}

export function AccountWorkspace() {
  const [account, setAccount] = useState<Account | null>(null);
  const [accountResolution, setAccountResolution] = useState<AccountResolutionState>({ state: "loading" });
  const [accountRefreshNonce, setAccountRefreshNonce] = useState(0);
  const [ordersState, setOrdersState] = useState<OrdersState>({ state: "loading" });
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [wishlistState, setWishlistState] = useState<WishlistState>({ state: "loading" });
  const [wishlistRemovals, setWishlistRemovals] = useState<Record<string, WishlistRemovalState | undefined>>({});
  const [addressesState, setAddressesState] = useState<AddressesState>({ state: "loading" });
  const [addressEdits, setAddressEdits] = useState<Record<string, AddressEditState | undefined>>({});
  const [addressDefaults, setAddressDefaults] = useState<Record<string, AddressDefaultState | undefined>>({});
  const [addressRemovals, setAddressRemovals] = useState<Record<string, AddressRemovalState | undefined>>({});
  const [tracking, setTracking] = useState<Record<string, TrackingState | undefined>>({});
  const [reviews, setReviews] = useState<ReviewState>({ state: "loading" });
  const [reviewSubmissions, setReviewSubmissions] = useState<Record<string, ReviewSubmissionState | undefined>>({});
  const [reviewSuccess, setReviewSuccess] = useState("");
  const reviewLoadInFlight = useRef<number | null>(null);
  const accountRequestRef = useRef(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addressCreateSuccess, setAddressCreateSuccess] = useState("");
  const [logoutState, setLogoutState] = useState<LogoutState>({ state: "idle" });

  const isCurrentRequest = (requestId: number) => accountRequestRef.current === requestId;

  const loadOrders = async (requestId = accountRequestRef.current, signal?: AbortSignal) => {
    setOrdersState({ state: "loading" });
    try {
      const { orders } = await getJSON<{ orders: CustomerOrder[] }>("/checkout/orders", signal);
      if (!isCurrentRequest(requestId)) return;
      setOrdersState({ state: "loaded", items: orders });
    } catch (reason) {
      if (!isCurrentRequest(requestId)) return;
      setOrdersState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to load orders." });
    }
  };
  const loadAddresses = async (requestId = accountRequestRef.current, signal?: AbortSignal) => {
    setAddressesState({ state: "loading" });
    try {
      const { addresses } = await getJSON<{ addresses: ShippingAddress[] }>("/addresses/", signal);
      if (!isCurrentRequest(requestId)) return;
      setAddressesState({ state: "loaded", items: addresses });
    } catch (reason) {
      if (!isCurrentRequest(requestId)) return;
      setAddressesState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to load shipping addresses." });
    }
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const requestId = accountRequestRef.current + 1;
    accountRequestRef.current = requestId;
    const initialize = async () => {
      setAccountResolution({ state: "loading" });
      try {
        const { account: current } = await getJSON<{ account: Account }>("/auth/me", controller.signal);
        if (!active || !isCurrentRequest(requestId)) return;
        setAccount(current);
        setAccountResolution({ state: "authenticated" });
        void loadOrders(requestId, controller.signal);
        void loadAddresses(requestId, controller.signal);
      } catch (reason) {
        if (!active || !isCurrentRequest(requestId)) return;
        setAccount(null);
        if (reason instanceof ApiError && reason.status === 401) {
          setAccountResolution({ state: "signed-out" });
          return;
        }
        setAccountResolution({ state: "error", message: reason instanceof Error ? reason.message : "Unable to load your account." });
      }
    };
    void initialize();
    return () => {
      active = false;
      controller.abort();
      if (isCurrentRequest(requestId)) accountRequestRef.current += 1;
    };
  }, [accountRefreshNonce]);

  const loadWishlist = async (requestId = accountRequestRef.current) => {
    setWishlistState({ state: "loading" });
    try {
      const { items } = await getJSON<{ items: WishlistItem[] }>("/wishlist/items");
      if (!isCurrentRequest(requestId)) return;
      setWishlist(items);
      setWishlistState({ state: "loaded" });
    } catch (reason) {
      if (!isCurrentRequest(requestId)) return;
      setWishlistState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to load saved pieces" });
    }
  };

  useEffect(() => {
    if (!account || account.role !== "customer") return;
    void loadWishlist(accountRequestRef.current);
  }, [account]);

  const loadEligibleReviews = useCallback(async (requestId = accountRequestRef.current) => {
    if (reviewLoadInFlight.current === requestId) return;
    reviewLoadInFlight.current = requestId;
    setReviews({ state: "loading" });
    try {
      const { items } = await getJSON<{ items: CustomerReviewEligibility[] }>("/reviews/eligible");
      if (accountRequestRef.current !== requestId) return;
      setReviews({ state: "loaded", items });
    } catch {
      if (accountRequestRef.current !== requestId) return;
      setReviews({ state: "error" });
    } finally {
      if (reviewLoadInFlight.current === requestId) reviewLoadInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    if (!account || account.role !== "customer") return;
    void loadEligibleReviews(accountRequestRef.current);
  }, [account, loadEligibleReviews]);

  const loadTracking = async (order: CustomerOrder) => {
    setTracking((current) => ({ ...current, [order.id]: { state: "loading" } }));
    try {
      const { order: trackedOrder } = await getJSON<{ order: CustomerOrderTracking }>(`/checkout/orders/${order.id}/tracking`);
      setTracking((current) => ({ ...current, [order.id]: { state: "loaded", order: trackedOrder } }));
    } catch (reason) {
      setTracking((current) => ({ ...current, [order.id]: { state: "error", message: customerTrackingErrorMessage(reason) } }));
    }
  };
  const removeWishlistItem = async (item: WishlistItem) => {
    setWishlistRemovals((current) => ({ ...current, [item.id]: { state: "removing" } }));
    try {
      await deleteJSON<{ removed: boolean }>(`/wishlist/${item.id}`);
      setWishlist((current) => current.filter((saved) => saved.id !== item.id));
      setWishlistRemovals((current) => {
        const { [item.id]: _, ...remaining } = current;
        return remaining;
      });
    } catch (reason) {
      setWishlistRemovals((current) => ({ ...current, [item.id]: { state: "error", message: reason instanceof Error ? reason.message : "Unable to remove saved piece" } }));
    }
  };


  const logout = async () => {
    setLogoutState({ state: "pending" });
    try {
      await postJSON<void>("/auth/logout", {});
      accountRequestRef.current += 1;
      setAccount(null);
      setAccountResolution({ state: "signed-out" });
      setOrdersState({ state: "loading" });
      setWishlist([]);
      setWishlistState({ state: "loading" });
      setWishlistRemovals({});
      setAddressesState({ state: "loading" });
      setAddressEdits({});
      setAddressDefaults({});
      setAddressRemovals({});
      setTracking({});
    } catch (reason) {
      setLogoutState({ state: "error", message: reason instanceof Error ? reason.message : "Unable to sign out. Please try again." });
    }
  };
  const addAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setAddressCreateSuccess(""); setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      await postJSON<{ address: ShippingAddress }>("/addresses/", { recipientName: String(form.get("recipientName")), phone: String(form.get("phone")), line1: String(form.get("line1")), city: String(form.get("city")), country: String(form.get("country") || "BD") });
      event.currentTarget.reset(); await loadAddresses();
      setAddressCreateSuccess("Shipping address saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save address"); }
    finally { setSaving(false); }
  };
  const editAddress = async (event: FormEvent<HTMLFormElement>, address: ShippingAddress) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields: AddressEditFields = {
      recipientName: String(form.get("recipientName") ?? ""), phone: String(form.get("phone") ?? ""), line1: String(form.get("line1") ?? ""), line2: String(form.get("line2") ?? ""),
      city: String(form.get("city") ?? ""), region: String(form.get("region") ?? ""), postalCode: String(form.get("postalCode") ?? ""), country: String(form.get("country") ?? ""),
    };
    const validationError = validateAddressUpdate(fields);
    if (validationError) { setAddressEdits((current) => ({ ...current, [address.id]: { state: "error", message: validationError } })); return; }
    const update = buildAddressUpdate(fields);
    setAddressEdits((current) => ({ ...current, [address.id]: { state: "saving" } }));
    try {
      const { address: updatedAddress } = await patchJSON<{ address: ShippingAddress }>(`/addresses/${address.id}`, update);
      setAddressesState((current) => current.state === "loaded" ? { state: "loaded", items: current.items.map((saved) => saved.id === updatedAddress.id ? updatedAddress : saved) } : current);
      setAddressEdits((current) => ({ ...current, [address.id]: { state: "success" } }));
    } catch (reason) {
      setAddressEdits((current) => ({ ...current, [address.id]: { state: "error", message: reason instanceof ApiError && reason.status === 404 ? "Address was not found or is no longer available." : reason instanceof Error ? reason.message : "Unable to save address." } }));
    }
  };
  const setDefaultAddress = async (address: ShippingAddress) => {
    if (address.isDefault) return;
    setAddressDefaults((current) => ({ ...current, [address.id]: { state: "saving" } }));
    try {
      const { address: updatedAddress } = await patchJSON<{ address: ShippingAddress }>(`/addresses/${address.id}/default`);
      setAddressesState((current) => current.state === "loaded" ? { state: "loaded", items: current.items.map((saved) => saved.id === updatedAddress.id ? { ...updatedAddress, isDefault: true } : { ...saved, isDefault: false }) } : current);
      setAddressDefaults((current) => ({ ...current, [address.id]: { state: "success" } }));
    } catch (reason) {
      setAddressDefaults((current) => ({ ...current, [address.id]: { state: "error", message: reason instanceof ApiError && reason.status === 404 ? "Address was not found or is no longer available." : reason instanceof Error ? reason.message : "Unable to set default shipping address." } }));
    }
  };
  const requestAddressRemoval = (address: ShippingAddress) => {
    setAddressRemovals((current) => ({ ...current, [address.id]: { state: "confirming" } }));
  };
  const cancelAddressRemoval = (address: ShippingAddress) => {
    setAddressRemovals((current) => {
      const { [address.id]: _, ...remaining } = current;
      return remaining;
    });
  };
  const removeAddress = async (address: ShippingAddress) => {
    setAddressRemovals((current) => ({ ...current, [address.id]: { state: "removing" } }));
    try {
      await deleteJSON<void>(`/addresses/${address.id}`);
      setAddressRemovals((current) => ({ ...current, [address.id]: { state: "success" } }));
      setAddressesState((current) => current.state === "loaded" ? { state: "loaded", items: current.items.filter((saved) => saved.id !== address.id) } : current);
    } catch (reason) {
      setAddressRemovals((current) => ({ ...current, [address.id]: { state: "error", message: reason instanceof ApiError && reason.status === 404 ? "Address was not found or is no longer available." : reason instanceof Error ? reason.message : "Unable to remove address." } }));
    }
  };
  const submitReview = async (event: FormEvent<HTMLFormElement>, item: CustomerReviewEligibility) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rating = Number(form.get("rating"));
    const title = String(form.get("title")).trim();
    const body = String(form.get("body")).trim();
    setReviewSuccess("");
    setReviewSubmissions((current) => ({ ...current, [item.orderItem.id]: { state: "saving" } }));
    try {
      await postJSON("/reviews/", { productId: item.product.id, orderItemId: item.orderItem.id, rating, title, body });
      setReviewSubmissions((current) => ({ ...current, [item.orderItem.id]: { state: "success" } }));
      setReviewSuccess("Review submitted.");
      setReviews((current) => current.state === "loaded" ? { state: "loaded", items: current.items.filter((eligible) => eligible.orderItem.id !== item.orderItem.id) } : current);
    } catch (reason) {
      setReviewSubmissions((current) => ({ ...current, [item.orderItem.id]: { state: "error", message: reason instanceof Error ? reason.message : "Unable to submit review" } }));
    }
  };

  if (accountResolution.state === "loading") return <main className={`account-shell customer-account-workspace ${styles.shell}`}><section className={`${styles.statePanel} ${styles.sectionPanel}`} aria-live="polite"><p className="eyebrow">Account</p><h1>Loading your account…</h1><p className="seller-state">Checking your current session.</p></section></main>;
  if (accountResolution.state === "error") return <main className={`account-shell customer-account-workspace ${styles.shell}`}><section className={`${styles.statePanel} ${styles.sectionPanel} ${styles.feedback}`} role="alert" aria-labelledby="account-load-error-heading"><p className="eyebrow">Account unavailable</p><h1 id="account-load-error-heading">We could not load your account.</h1><p>{accountResolution.message}</p><button className="primary-button" type="button" onClick={() => setAccountRefreshNonce((current) => current + 1)}>Retry loading your account</button></section></main>;
  if (accountResolution.state === "signed-out") return <main className={`account-shell customer-account-workspace ${styles.shell}`}><header className="seller-topbar customer-account-topbar"><Link className="marketplace-brand" href="/"><BrandLogo monogram className="marketplace-brand-mark" priority /><span>NexaMart</span></Link><Link className="account-switch" href="/">Continue browsing</Link></header><section className={`${styles.statePanel} ${styles.sectionPanel} account-auth`} aria-labelledby="account-entry-heading"><p className="eyebrow">Your NexaMart account</p><h1 id="account-entry-heading">Welcome back.</h1><p>Sign in to view orders, saved pieces, and shipping addresses tied to your session.</p><div className="role-auth-actions"><Link className="primary-button" href="/login">Sign in</Link><Link className="account-switch" href="/register">Create an account</Link></div></section></main>;
  if (!account) return null;

  return <main className={`account-shell customer-account-workspace ${styles.shell}`}>
    <header className="seller-topbar customer-account-topbar"><Link className="marketplace-brand" href="/"><BrandLogo monogram className="marketplace-brand-mark" priority /><span>NexaMart</span></Link><div><button className="account-switch" type="button" onClick={() => void logout()} disabled={logoutState.state === "pending"}>{logoutState.state === "pending" ? "Signing out…" : "Sign out"}</button>{logoutState.state === "error" && <div role="alert"><p className="seller-error">{logoutState.message}</p><button className="account-switch" type="button" onClick={() => void logout()}>Try signing out again</button></div>}</div></header>
    <a className={styles.skipLink} href="#account-content">Skip to account content</a>
    <div id="account-content" className={styles.content} tabIndex={-1}>
    <section className="account-hero"><div className={styles.overview}><p className="eyebrow">Your NexaMart account</p><h1>Hi, {account.name}.</h1><p>{account.email} · {account.role}</p></div></section>
    <nav className="orchid-navigation account-section-navigation" aria-label="Account sections"><a href="#orders">Orders</a>{account.role === "customer" && <a href="#reviews">Reviews</a>}<a href="#addresses">Addresses</a>{account.role === "customer" && <a href="#wishlist">Saved pieces</a>}</nav>
    <section className="trust account-data-summary" aria-label="Account overview"><span><strong>{ordersState.state === "loaded" ? ordersState.items.length : "—"}</strong> orders</span><span><strong>{addressesState.state === "loaded" ? addressesState.items.length : "—"}</strong> addresses</span>{account.role === "customer" && <span><strong>{wishlistState.state === "loaded" ? wishlist.length : "—"}</strong> saved pieces</span>}</section>
    <section id="orders" className="account-orders" aria-labelledby="customer-orders-heading"><p className="eyebrow">Order history</p><h2 id="customer-orders-heading">Everything you chose.</h2>{ordersState.state === "loading" ? <p className="seller-state" aria-live="polite">Loading orders…</p> : ordersState.state === "error" ? <div role="alert"><p className="seller-error">{ordersState.message}</p><button className="account-switch" type="button" onClick={() => void loadOrders()}>Retry loading orders</button></div> : ordersState.items.length ? ordersState.items.map((order) => {
      const trackingState = tracking[order.id];
      const timeline = trackingState?.state === "loaded" ? customerTrackingTimelineEvents(trackingState.order.events) : [];
      return <article key={order.id} className="customer-order">
        <div><strong>{order.reference}</strong><small>{customerOrderItemSummary(order.items)} · {new Date(order.createdAt).toLocaleDateString()}</small></div><strong>${order.total.toFixed(2)}</strong><span className={`status order-${order.status}`}>{order.status}</span>
        <div className="customer-order-tracking">
          {!trackingState && <button className="account-switch" onClick={() => void loadTracking(order)}>View fulfillment</button>}
          {trackingState?.state === "loading" && <p className="seller-state" aria-live="polite">Loading fulfillment updates…</p>}
          {trackingState?.state === "error" && <div role="alert"><p className="seller-error">{trackingState.message || "Unable to load fulfillment updates"}</p><button className="account-switch" onClick={() => void loadTracking(order)}>Try again</button></div>}
          {trackingState?.state === "loaded" && <section className="fulfillment-timeline" aria-label={`Fulfillment timeline for ${trackingState.order.reference}`}>
            <h3>Fulfillment timeline</h3>
            <ul className="fulfillment-items">{trackingState.order.items.map((item) => <li key={item.id}><span>{item.productName} ×{item.quantity}</span><strong>{item.fulfillmentStatus}</strong></li>)}</ul>
            {timeline.length ? <ol>{timeline.map((event) => <li key={event.id}><strong>{event.title}</strong><span>{event.detail}</span><time dateTime={event.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</time></li>)}</ol> : <p className="seller-state">{customerTrackingEmptyMessage()}</p>}
          </section>}
        </div>
      </article>;
    }) : <p className="seller-state">No orders have been placed from this account yet. Your order history is clear. The collection is waiting.</p>}</section>
    {account.role === "customer" && <section id="reviews" className="customer-reviews" aria-labelledby="customer-reviews-heading"><p className="eyebrow">Delivered purchases</p><h2 id="customer-reviews-heading">Review delivered purchases</h2><p className="customer-reviews-note">Share feedback only for items delivered to you.</p>{reviewSuccess && <p className="customer-review-success" role="status">{reviewSuccess}</p>}{reviews.state === "loading" ? <p className="seller-state" aria-live="polite">Loading delivered purchases…</p> : reviews.state === "error" ? <div role="alert"><p className="seller-error">Unable to load delivered purchases.</p><button className="account-switch" type="button" aria-label="Retry loading delivered purchases" onClick={() => void loadEligibleReviews()}>Retry loading delivered purchases</button></div> : reviews.items.length ? <div className="customer-review-list">{reviews.items.map((item) => {
      const submission = reviewSubmissions[item.orderItem.id];
      return <article className="customer-review" key={item.orderItem.id}><div className="customer-review-product"><div><strong>{item.product.name}</strong><small>Order {item.order.reference}</small></div></div>{submission?.state === "success" ? <p className="customer-review-success" role="status">Review submitted.</p> : <form onSubmit={(event) => void submitReview(event, item)}><label>Rating<select name="rating" defaultValue="5" required><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Fair</option><option value="1">1 — Poor</option></select></label><label>Title<input name="title" required minLength={2} maxLength={120} /></label><label>Review<textarea name="body" required minLength={2} maxLength={2000} rows={4} /></label>{submission?.state === "error" && <p className="seller-error" role="alert">{submission.message || "Unable to submit review"}</p>}<button className="primary-button" disabled={submission?.state === "saving"}>{submission?.state === "saving" ? "Submitting review…" : "Submit review"}</button></form>}</article>;
    })}</div> : <p className="seller-state">No delivered purchases are waiting for a review.</p>}</section>}
    <section id="addresses" className="account-addresses" aria-labelledby="shipping-addresses-heading">
      <p className="eyebrow">Shipping addresses</p>
      <h2 id="shipping-addresses-heading">Where should we send it?</h2>
      {addressesState.state === "loading" ? <p className="seller-state" aria-live="polite">Loading shipping addresses…</p> : addressesState.state === "error" ? <div role="alert"><p className="seller-error">{addressesState.message}</p><button className="account-switch" type="button" onClick={() => void loadAddresses()}>Retry loading addresses</button></div> : addressesState.items.length ? <div className="account-address-list">{addressesState.items.map((address) => {
        const edit = addressEdits[address.id];
        const defaultAction = addressDefaults[address.id];
        const removal = addressRemovals[address.id];
        return <article key={address.id} className="account-address-editor">
          <div className="account-address-summary"><div><strong>{address.recipientName}</strong><small>{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode}, {address.country}</small></div>{account.role === "customer" && (address.isDefault ? <span className="status order-confirmed" aria-label="Default shipping address">Default shipping address</span> : <button className="account-switch account-address-default-action" type="button" aria-label={`Set ${address.recipientName} as default shipping address`} onClick={() => void setDefaultAddress(address)} disabled={defaultAction?.state === "saving"}>{defaultAction?.state === "saving" ? "Setting default address…" : "Set as default"}</button>)}</div>
          {defaultAction?.state === "success" && <p className="seller-profile-success" role="status">Default shipping address saved.</p>}
          {defaultAction?.state === "error" && <p className="seller-error" role="alert">{defaultAction.message}</p>}
          {account.role === "customer" && (removal?.state === "confirming" ? <div className="account-address-removal-confirmation" role="alert"><p>Remove this address?</p><div><button className="account-address-remove" type="button" onClick={() => void removeAddress(address)}>Confirm removal</button><button className="account-switch" type="button" onClick={() => cancelAddressRemoval(address)}>Cancel</button></div></div> : <button className="account-address-remove" type="button" aria-label={`Remove shipping address for ${address.recipientName}`} onClick={() => requestAddressRemoval(address)} disabled={removal?.state === "removing"}>{removal?.state === "removing" ? "Removing address…" : "Remove address"}</button>)}
          {removal?.state === "error" && <p className="seller-error" role="alert">{removal.message}</p>}
          <form onSubmit={(event) => void editAddress(event, address)} aria-label={`Edit shipping address for ${address.recipientName}`}>
            <div className="account-address-form-grid">
              <label>Recipient<input required name="recipientName" minLength={2} maxLength={160} autoComplete="name" defaultValue={address.recipientName} disabled={edit?.state === "saving"} /></label>
              <label>Phone<input required name="phone" minLength={5} maxLength={40} inputMode="tel" autoComplete="tel" defaultValue={address.phone} disabled={edit?.state === "saving"} /></label>
              <label className="wide">Address line 1<input required name="line1" minLength={2} maxLength={240} autoComplete="address-line1" defaultValue={address.line1} disabled={edit?.state === "saving"} /></label>
              <label className="wide">Address line 2 (optional)<input name="line2" maxLength={240} autoComplete="address-line2" defaultValue={address.line2 ?? ""} disabled={edit?.state === "saving"} /></label>
              <label>City<input required name="city" minLength={2} maxLength={120} autoComplete="address-level2" defaultValue={address.city} disabled={edit?.state === "saving"} /></label>
              <label>Region (optional)<input name="region" maxLength={120} autoComplete="address-level1" defaultValue={address.region ?? ""} disabled={edit?.state === "saving"} /></label>
              <label>Postal code (optional)<input name="postalCode" maxLength={32} autoComplete="postal-code" defaultValue={address.postalCode ?? ""} disabled={edit?.state === "saving"} /></label>
              <label>Country code<input required name="country" minLength={2} maxLength={2} pattern="[A-Za-z]{2}" autoComplete="country" defaultValue={address.country} disabled={edit?.state === "saving"} /></label>
            </div>
            <button className="account-switch" type="submit" disabled={edit?.state === "saving"}>{edit?.state === "saving" ? "Saving address…" : "Save changes"}</button>
            {edit?.state === "success" && <p className="seller-profile-success" role="status">Address saved.</p>}
            {edit?.state === "error" && <p className="seller-error" role="alert">{edit.message}</p>}
          </form>
        </article>;
      })}</div> : <p className="seller-state">No shipping addresses have been saved to this account yet. Add a shipping address before placing an order.</p>}
      <form onSubmit={addAddress}><label>Recipient<input required name="recipientName" minLength={2} /></label><label>Phone<input required name="phone" minLength={5} inputMode="tel" /></label><label>Address<input required name="line1" minLength={2} autoComplete="street-address" /></label><label>City<input required name="city" minLength={2} autoComplete="address-level2" /></label><label>Country code<input required name="country" defaultValue="BD" minLength={2} maxLength={2} autoComplete="country" /></label>{error && <p className="seller-error" role="alert">{error}</p>}{addressCreateSuccess && <p className="seller-profile-success" role="status">{addressCreateSuccess}</p>}<button className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save shipping address"}</button></form>
    </section>
    {account.role === "customer" && <section id="wishlist" className="account-wishlist" aria-labelledby="customer-wishlist-heading"><p className="eyebrow">Saved pieces</p><h2 id="customer-wishlist-heading">Your shortlist.</h2>{wishlistState.state === "loading" ? <p className="seller-state" aria-live="polite">Loading saved pieces…</p> : wishlistState.state === "error" ? <div role="alert"><p className="seller-error">{wishlistState.message || "Unable to load saved pieces"}</p><button className="account-switch" type="button" aria-label="Retry loading saved pieces" onClick={() => void loadWishlist()}>Try again</button></div> : wishlist.length ? <div className="wishlist-list">{wishlist.map((item) => {
      const removal = wishlistRemovals[item.id];
          return <article key={item.id}><WishlistMedia item={item} /><div><strong>{item.name}</strong><small>${item.price.toFixed(2)}</small></div><div className="wishlist-action"><button className="wishlist-remove" aria-label={`Remove ${item.name} from saved pieces`} onClick={() => void removeWishlistItem(item)} disabled={removal?.state === "removing"}>{removal?.state === "removing" ? "Removing…" : "Remove"}</button>{removal?.state === "error" && <p className="seller-error" role="alert">{removal.message || "Unable to remove saved piece"}</p>}</div></article>;
    })}</div> : <p className="seller-state">No saved pieces are available for this account yet. Save pieces from the collection to revisit them here.</p>}</section>}
    </div>
  </main>;
}
