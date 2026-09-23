"use client";
/* eslint-disable @next/next/no-img-element -- catalog imagery is dynamic and cross-origin by design */

import { ArrowUpRight, Heart, LayoutGrid, Menu, Minus, Plus, Search, ShoppingBag, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import styles from "./Storefront.module.css";
import { selectShippingAddressId } from "@/features/cart/checkout-address-selection";
import { cartAddError } from "@/features/cart/cart-add-feedback";
import { checkoutPayload } from "@/features/cart/checkout.utils";
import { catalogLoadFailure, catalogLoadSuccess } from "@/features/catalog/catalog-load-state";
import { buildCatalogDiscoveryPath, catalogDiscoveryFacets, catalogFiltersFromSearchParams, catalogFiltersToSearchParams, type CatalogTaxonomy } from "@/features/catalog/catalog-discovery";
import { headerWishlistPath } from "@/features/catalog/header-wishlist";
import { accountDestination, accountDestinationLabel } from "@/features/account/account-destination";
import { buildProductPresentation, productImageSource } from "@/features/catalog/product-presentation";
import { wishlistSaveError } from "@/features/catalog/wishlist-save";
import { referenceFacetProducts, type AvailabilityFacet, type ProductTypeFacet } from "@/features/catalog/reference-facets";
import { useCart } from "@/hooks/useCart";
import { BrandLogo } from "@/components/BrandLogo";
import { getJSON, postJSON } from "@/lib/api";
import type { ShippingAddress } from "@/types/account";
import type { Product } from "@/types/catalog";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
type CatalogPayload = { products: Product[]; categories: { name: string; count: number }[] };
type ProductVisualProps = { product: Pick<Product, "id" | "name" | "image">; className?: string; priority?: boolean };
type WishlistSaveState = { state: "saving" } | { state: "success" } | { state: "error"; message: string };
type CartAddState = { state: "pending" } | { state: "success" } | { state: "error"; message: string };

function ServerPrice({ product }: { product: Pick<Product, "price" | "effectivePrice"> }) {
  const { effectivePrice, price } = product;
  const currentPrice = effectivePrice ?? price;
  return <span className="server-price"><strong>{money.format(currentPrice)}</strong></span>;
}

function ProductVisual({ product, className = "", priority = false }: ProductVisualProps) {
  const source = productImageSource(product.image, product.id);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!source || failed) {
    return <div className={`product-visual product-visual-fallback ${className}`} role="img" aria-label={`${product.name} product image unavailable`}>
      <span aria-hidden="true">{product.image}</span>
    </div>;
  }

  return <div className={`product-visual ${loaded ? "is-loaded" : "is-loading"} ${className}`} aria-busy={!loaded}>
    <img src={source} alt={product.name} loading={priority ? "eager" : "lazy"} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
  </div>;
}


type DiscoveryProductCardProps = {
  product: Product;
  cartAdd?: CartAddState;
  wishlistSave?: WishlistSaveState;
  onAdd: () => void;
  onSave: () => void;
  showRegularPrice?: boolean;
};

function HeroDiscoveryCanvas({ products }: { products: Product[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion || products.length < 2) return;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % products.length), 5000);
    return () => window.clearInterval(timer);
  }, [products.length, reducedMotion]);

  if (products.length === 0) {
    return <div className={styles.heroEmptyMedia} role="status">No catalog product image is available right now.</div>;
  }

  const activeProduct = products[activeIndex % products.length];
  const presentation = buildProductPresentation(activeProduct);
  return <a className={styles.heroGalleryStage} href={"/products/" + activeProduct.slug} aria-label={"View " + activeProduct.name}><span className={styles.heroGalleryBloom} aria-hidden="true"/><ProductVisual key={activeProduct.id} product={activeProduct} className={styles.heroGalleryMedia} priority/><span className={styles.heroGalleryCaption}><span>{presentation.brand ?? activeProduct.category}</span><strong>{activeProduct.name}</strong></span></a>;
}

function DiscoveryProductCard({ product, cartAdd, wishlistSave, onAdd, onSave, showRegularPrice = false }: DiscoveryProductCardProps) {
  const presentation = buildProductPresentation(product);
  const hasLowerEffectivePrice = product.effectivePrice !== undefined && product.effectivePrice < product.price;
  const currentPrice = product.effectivePrice ?? product.price;

  return <article className={styles.discoveryProductCard}>
    <a className={styles.discoveryProductLink} href={`/products/${product.slug}`}><ProductVisual product={product} className={styles.discoveryProductMedia}/><div className={styles.discoveryProductContent}><p>{presentation.brand ?? product.category}</p><h3>{product.name}</h3><span className={styles.discoveryPrice}><strong>{money.format(currentPrice)}</strong>{showRegularPrice && hasLowerEffectivePrice && <span>Regular price {money.format(product.price)}</span>}</span>{product.inStock && <small className={styles.discoveryAvailability}>In stock</small>}</div></a>
    {product.storeName && product.storeSlug ? <a className={styles.discoveryStoreAttribution} href={`/stores/${product.storeSlug}`}>From {product.storeName}</a> : null}
    <div className={styles.discoveryProductActions}><button className={styles.discoverySaveButton} type="button" onClick={onSave} disabled={wishlistSave?.state === "saving"} aria-label={`Save ${product.name}`} aria-busy={wishlistSave?.state === "saving"}><Heart size={17}/><span>{wishlistSave?.state === "saving" ? "Saving…" : "Save"}</span></button><button className={styles.discoveryAddButton} type="button" onClick={onAdd} disabled={!product.inStock || cartAdd?.state === "pending"} aria-busy={cartAdd?.state === "pending"}>{cartAdd?.state === "pending" ? "Adding…" : product.inStock ? "Add to bag" : "Out of stock"}</button></div>
    {cartAdd?.state === "success" && <p className={styles.discoveryFeedback} role="status">Added to bag.</p>}{cartAdd?.state === "error" && <p className={styles.discoveryFeedback} role="alert">{cartAdd.message}</p>}{wishlistSave?.state === "success" && <p className={styles.discoveryFeedback} role="status">Saved.</p>}{wishlistSave?.state === "error" && <p className={styles.discoveryFeedback} role="alert">{wishlistSave.message}</p>}
  </article>;
}

export function Storefront() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilters = catalogFiltersFromSearchParams(new URLSearchParams(searchParams?.toString()));
  const [catalog, setCatalog] = useState<CatalogPayload>({ products: [], categories: [] });
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [newArrivalsState, setNewArrivalsState] = useState<"loading" | "loaded" | "error">("loading");
  const [newArrivalsReloadNonce, setNewArrivalsReloadNonce] = useState(0);
  const [query, setQuery] = useState(initialFilters.query);
  const [category, setCategory] = useState(initialFilters.categoryName);
  const [subcategory, setSubcategory] = useState(initialFilters.subcategorySlug);
  const [brand, setBrand] = useState(initialFilters.brandSlug);
  const [sort, setSort] = useState<"newest" | "">(initialFilters.sort ?? "");
  const [availability, setAvailability] = useState<AvailabilityFacet>("all");
  const [productType, setProductType] = useState<ProductTypeFacet>("all");
  const [spotlightRailVisible, setSpotlightRailVisible] = useState(false);
  const [taxonomy, setTaxonomy] = useState<CatalogTaxonomy>({ categories: [], subcategories: [], brands: [] });
  const [taxonomyState, setTaxonomyState] = useState<"loading" | "loaded" | "error">("loading");
  const [taxonomyReloadNonce, setTaxonomyReloadNonce] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutRecovery, setCheckoutRecovery] = useState<{ reference: string } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string | null>(null);
  const [addressLoadState, setAddressLoadState] = useState<"idle" | "loaded" | "error">("idle");
  const [addressReloadNonce, setAddressReloadNonce] = useState(0);
  const [cartRemovalError, setCartRemovalError] = useState<{ itemId: string; message: string } | null>(null);
  const [wishlistSaves, setWishlistSaves] = useState<Record<string, WishlistSaveState | undefined>>({});
  const [cartAdds, setCartAdds] = useState<Record<string, CartAddState | undefined>>({});
  const [error, setError] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const cart = useCart();
  const cartOpenerRef = useRef<HTMLElement | null>(null);
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null);
  const collectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const spotlightRailRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const checkoutKeyRef = useRef<string | null>(null);
  const wishlistSavingIds = useRef(new Set<string>());
  const cartAddingIds = useRef(new Set<string>());

  useEffect(() => {
    const filters = catalogFiltersFromSearchParams(new URLSearchParams(searchParams?.toString()));
    setQuery(filters.query);
    setCategory(filters.categoryName);
    setSubcategory(filters.subcategorySlug);
    setBrand(filters.brandSlug);
    setSort(filters.sort ?? "");
  }, [searchParams]);

  useEffect(() => {
    const params = catalogFiltersToSearchParams({ query, categoryName: category, subcategorySlug: subcategory, brandSlug: brand, sort }, new URLSearchParams(searchParams?.toString()));
    const nextUrl = params.toString() ? `${pathname}?${params}` : pathname;
    const currentUrl = searchParams?.toString() ? `${pathname}?${searchParams}` : pathname;
    if (nextUrl !== currentUrl) router.replace(nextUrl, { scroll: false });
  }, [brand, category, pathname, query, router, searchParams, sort, subcategory]);

  useEffect(() => {
    const taxonomyController = new AbortController();
    setTaxonomyState("loading");
    getJSON<CatalogTaxonomy>("/catalog/taxonomy", taxonomyController.signal)
      .then((payload) => {
        setTaxonomy(payload);
        setTaxonomyState("loaded");
      })
      .catch((reason: unknown) => {
        if (!taxonomyController.signal.aborted && catalogLoadFailure(reason)) setTaxonomyState("error");
      });
    return () => taxonomyController.abort();
  }, [taxonomyReloadNonce]);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogLoaded(false);
    setError("");
    getJSON<CatalogPayload>(buildCatalogDiscoveryPath({ query, categoryName: category, subcategorySlug: subcategory, brandSlug: brand, sort }), controller.signal)
      .then((payload) => {
        setCatalog(payload);
        setCatalogLoaded(true);
        setError(catalogLoadSuccess().error);
      })
      .catch((reason: unknown) => {
        const failure = catalogLoadFailure(reason);
        if (failure) {
          setCatalogLoaded(true);
          setError(failure.error);
        }
      });
    return () => controller.abort();
  }, [query, category, subcategory, brand, sort, reloadNonce]);

  useEffect(() => {
    const controller = new AbortController();
    setNewArrivalsState("loading");
    getJSON<CatalogPayload>("/catalog/products?sort=newest", controller.signal)
      .then(({ products }) => {
        setNewArrivals(products);
        setNewArrivalsState("loaded");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted && catalogLoadFailure(reason)) setNewArrivalsState("error");
      });
    return () => controller.abort();
  }, [newArrivalsReloadNonce]);

  useEffect(() => {
    if (cartOpen) closeButtonRef.current?.focus();
  }, [cartOpen]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("bag") === "1") setCartOpen(true);
  }, []);

  const closeMobileNav = () => {
    setMobileNavOpen(false);
    requestAnimationFrame(() => mobileNavToggleRef.current?.focus());
  };
  const handleMobileNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      closeMobileNav();
    }
  };

  useEffect(() => {
    if (!cartOpen || !cart.authenticated) return;
    const controller = new AbortController();
    getJSON<{ addresses: ShippingAddress[] }>("/addresses/", controller.signal)
      .then(({ addresses }) => {
        setSavedAddresses(addresses);
        setSelectedShippingAddressId((currentId) => selectShippingAddressId(addresses, currentId));
        setAddressLoadState("loaded");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAddressLoadState("error");
      });
    return () => controller.abort();
  }, [cartOpen, cart.authenticated, addressReloadNonce]);

  const checkoutAvailable = cart.authenticated && addressLoadState === "loaded" && savedAddresses.length > 0 && Boolean(selectedShippingAddressId);
  const { subcategories, applied } = useMemo(() => catalogDiscoveryFacets(taxonomy, { query, categoryName: category, subcategorySlug: subcategory, brandSlug: brand }), [taxonomy, query, category, subcategory, brand]);
  const hasActiveCatalogFilter = Boolean(query.trim() || category || subcategory || brand);
  const departmentTiles = useMemo(() => taxonomy.categories.slice(0, 8).map((department, index) => ({
    department,
    product: catalog.products.find((product) => product.category === department.name) ?? catalog.products[index],
  })).filter((item): item is { department: CatalogTaxonomy["categories"][number]; product: Product } => Boolean(item.product)), [taxonomy.categories, catalog.products]);
  const visibleProducts = useMemo(() => referenceFacetProducts(catalog.products, availability, productType), [availability, catalog.products, productType]);
  const productCountLabel = catalogLoaded ? `${visibleProducts.length} ${visibleProducts.length === 1 ? "product" : "products"}` : "Loading products";
  const featuredProducts = useMemo(() => catalog.products.filter((product) => product.inStock).slice(0, 6), [catalog.products]);
  const heroProducts = useMemo(() => catalog.products.filter((product) => Boolean(productImageSource(product.image, product.id))).slice(0, 4), [catalog.products]);
  const flashDeals = useMemo(() => catalog.products.filter((product) => product.effectivePrice !== undefined && product.effectivePrice < product.price).slice(0, 4), [catalog.products]);

  useEffect(() => {
    const spotlightRail = spotlightRailRef.current;
    if (!spotlightRail || spotlightRailVisible || featuredProducts.length === 0) return;
    if (typeof IntersectionObserver === "undefined") {
      setSpotlightRailVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSpotlightRailVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(spotlightRail);
    return () => observer.disconnect();
  }, [featuredProducts.length, spotlightRailVisible]);
  const selectDepartment = (departmentName: string) => {
    setCatalogLoaded(false);
    setCategory(departmentName);
    setSubcategory("");
    setMobileNavOpen(false);
    scrollToCollection();
  };
  const scrollToCollection = () => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("collection")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  };
  const browseCatalog = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToCollection();
    requestAnimationFrame(() => collectionHeadingRef.current?.focus());
  };
  const openCart = (opener: HTMLElement) => {
    cartOpenerRef.current = opener;
    setCartOpen(true);
  };
  const closeCart = () => {
    setCartOpen(false);
    requestAnimationFrame(() => cartOpenerRef.current?.focus());
  };
  const handleDrawerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      closeCart();
      return;
    }
    if (event.key !== "Tab") return;
    const panel = event.currentTarget.querySelector<HTMLElement>(".drawer-panel");
    const focusable = panel ? Array.from(panel.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])")) : [];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      focusable[focusable.length - 1]?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      focusable[0]?.focus();
    }
  };
  const saveWishlist = async (productId: string) => {
    if (wishlistSavingIds.current.has(productId)) return;
    if (!cart.authenticated) {
      setWishlistSaves((current) => ({ ...current, [productId]: { state: "error", message: "Sign in from Account to save pieces." } }));
      return;
    }
    wishlistSavingIds.current.add(productId);
    setWishlistSaves((current) => ({ ...current, [productId]: { state: "saving" } }));
    try {
      await postJSON<void>("/wishlist/items", { productId });
      setWishlistSaves((current) => ({ ...current, [productId]: { state: "success" } }));
    } catch (reason) {
      setWishlistSaves((current) => ({ ...current, [productId]: { state: "error", message: wishlistSaveError(reason) } }));
    } finally {
      wishlistSavingIds.current.delete(productId);
    }
  };
  const addToCart = async (product: Product) => {
    if (cartAddingIds.current.has(product.id)) return;
    if (!product.inStock) return;
    cartAddingIds.current.add(product.id);
    setCartAdds((current) => ({ ...current, [product.id]: { state: "pending" } }));
    try {
      await cart.add(product);
      setCartAdds((current) => ({ ...current, [product.id]: { state: "success" } }));
    } catch (reason) {
      setCartAdds((current) => ({ ...current, [product.id]: { state: "error", message: cartAddError(reason) } }));
    } finally {
      cartAddingIds.current.delete(product.id);
    }
  };
  const removeCartItem = async (item: typeof cart.items[number]) => {
    setCartRemovalError(null);
    try {
      await cart.remove(item);
    } catch {
      setCartRemovalError({ itemId: item.id, message: `Unable to remove ${item.name}. Try again.` });
    }
  };
  const checkout = async () => {
    if (checkoutRecovery) {
      await retryCartCleanup();
      return;
    }
    if (!cart.authenticated) {
      setCheckoutMessage("Sign in from Account to place your order.");
      return;
    }
    if (addressLoadState === "idle") {
      setCheckoutMessage("Saved addresses are still loading. Wait for them before placing your order.");
      return;
    }
    if (addressLoadState === "error") {
      setCheckoutMessage("Unable to load saved addresses. Retry saved addresses before placing your order.");
      return;
    }
    if (savedAddresses.length === 0) {
      setCheckoutMessage("Add a saved shipping address in Account before placing your order.");
      return;
    }
    if (!selectedShippingAddressId) {
      setCheckoutMessage("Choose a saved shipping address before placing your order.");
      return;
    }
    if (!checkoutAvailable) return;
    setCheckoutPending(true);
    setCheckoutMessage("");
    try {
      const idempotencyKey = checkoutKeyRef.current ?? crypto.randomUUID();
      checkoutKeyRef.current = idempotencyKey;
      const { order } = await postJSON<{ order: { reference: string } }>("/checkout/orders", checkoutPayload(cart.items, selectedShippingAddressId), { "Idempotency-Key": idempotencyKey });
      try {
        await cart.clear();
        checkoutKeyRef.current = null;
        setCheckoutRecovery(null);
        setCheckoutMessage(`Order ${order.reference} was created. View it in Account.`);
      } catch {
        setCheckoutRecovery({ reference: order.reference });
        setCheckoutMessage(`Order ${order.reference} was created, but we could not clear your bag.`);
      }
    } catch (reason) {
      setCheckoutMessage(reason instanceof Error ? reason.message : "Checkout failed");
    } finally {
      setCheckoutPending(false);
    }
  };
  const retryCartCleanup = async () => {
    if (!checkoutRecovery) return;
    setCheckoutPending(true);
    setCheckoutMessage("");
    try {
      await cart.clear();
      checkoutKeyRef.current = null;
      setCheckoutRecovery(null);
      setCheckoutMessage(`Order ${checkoutRecovery.reference} was created. Your bag is now cleared. View it in Account.`);
    } catch {
      setCheckoutMessage(`Order ${checkoutRecovery.reference} was created, but we could not clear your bag.`);
    } finally {
      setCheckoutPending(false);
    }
  };

  const skipToCollection = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    collectionHeadingRef.current?.focus();
  };

  return <main className="storefront customer-experience orchid-explore reference-explore-layout" aria-labelledby="explore-heading">
    <a className="storefront-skip-link" href="#collection-heading" onClick={skipToCollection}>Skip to collection</a>
    <header id="top" className="marketplace-header" onKeyDown={handleMobileNavKeyDown}>
      <div className="shell marketplace-topbar">
        <a className="marketplace-brand" href="#top" aria-label="NexaMart marketplace"><BrandLogo monogram className="marketplace-brand-mark" priority /><span>NexaMart</span></a>
        <nav className="reference-explore-tabs" aria-label="Explore sections"><a href="#collection">Shop</a><a href="#collection">Categories</a><a href="#new-arrivals-heading">New Arrivals</a><a href="#collection">For You</a></nav>
        <label className="marketplace-search"><Search size={17}/><span className="sr-only">Search the marketplace</span><input id="product-search" aria-label="Search the marketplace" value={query} onChange={(event) => { setCatalogLoaded(false); setQuery(event.target.value); }} placeholder="Search products, brands, and departments" /></label>
        <div className="marketplace-actions"><Link className="marketplace-action-icon" href={headerWishlistPath(cart.authenticated)} aria-label="Open saved pieces"><Heart size={17}/></Link>
          <Link className="marketplace-action-icon" href={accountDestination(cart.accountRole)} aria-label={accountDestinationLabel(cart.accountRole)}><UserRound size={17}/></Link>
          <button ref={mobileNavToggleRef} className="icon-button mobile-menu-toggle" type="button" aria-label="Toggle marketplace categories" aria-expanded={mobileNavOpen} aria-controls="marketplace-category-navigation" onClick={() => mobileNavOpen ? closeMobileNav() : setMobileNavOpen(true)}><Menu size={18} /></button>
          <button className="marketplace-bag" aria-label="Open shopping bag" onClick={(event) => openCart(event.currentTarget)}><ShoppingBag size={18}/><span>Bag{cart.totalItems ? ` ${cart.totalItems}` : ""}</span></button>
        </div>
      </div>
      <nav id="marketplace-category-navigation" className={`marketplace-category-nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Marketplace categories">
        <div className="shell marketplace-rail"><button type="button" aria-label="Browse all departments" className={!category ? "active" : ""} aria-pressed={!category} onClick={() => { setCatalogLoaded(false); setCategory(""); setSubcategory(""); }}>Browse all departments</button>{taxonomy.categories.map((item) => <button key={item.id} type="button" className={category === item.name ? "active" : ""} aria-pressed={category === item.name} onClick={() => selectDepartment(item.name)}>{item.name}</button>)}<Link className="mobile-marketplace-account" href="/stores" onClick={() => setMobileNavOpen(false)}>Stores</Link><Link className="mobile-marketplace-account" href={headerWishlistPath(cart.authenticated)} onClick={() => setMobileNavOpen(false)}>Wishlist</Link><Link className="mobile-marketplace-account" href={accountDestination(cart.accountRole)} aria-label={accountDestinationLabel(cart.accountRole)} onClick={() => setMobileNavOpen(false)}>Account</Link><a href="#catalog-information" onClick={() => setMobileNavOpen(false)}>Catalog information</a></div>
      </nav>
    </header>

    <section id="departments" className="department-showcase shell"><div className="marketplace-section-head"><div><p className="eyebrow">Departments</p><h2>Browse departments</h2></div><a className="text-link" href="#collection">See every product <ArrowUpRight size={16}/></a></div><div className="department-tile-rail" aria-label="Browse departments">{departmentTiles.map((item) => <button key={item.department.id} type="button" className="department-tile" onClick={() => selectDepartment(item.department.name)}><ProductVisual key={item.product.id} product={item.product}/><span>{item.department.name}</span><small>Browse department <ArrowUpRight size={14}/></small></button>)}{taxonomyState === "loading" ? <p className="taxonomy-state" role="status">Loading departments…</p> : taxonomyState === "error" ? <p className="taxonomy-state" role="alert">Unable to load departments. <button type="button" onClick={() => setTaxonomyReloadNonce((value) => value + 1)}>Retry departments</button></p> : taxonomy.categories.length === 0 ? <p className="taxonomy-state" role="status">No departments are available right now.</p> : null}</div></section>

    {featuredProducts.length > 0 && <section className="deal-showcase shell" aria-label="Available catalog products"><div className="marketplace-section-head"><div><p className="eyebrow">Browse products</p><h2>Catalog picks</h2></div><a className="text-link" href="#collection">See the catalog <ArrowUpRight size={16}/></a></div><div ref={spotlightRailRef} className={styles.spotlightRail} tabIndex={0} aria-label="Available catalog products. Scroll horizontally for more products.">{featuredProducts.map((product, index) => { const presentation = buildProductPresentation(product); const cartAdd = cartAdds[product.id]; return <article className={`${styles.spotlightCard} ${spotlightRailVisible ? styles.spotlightCardVisible : ""}`} style={{ animationDelay: `${index * 45}ms` }} key={product.id}><a className={styles.spotlightProductLink} href={`/products/${product.slug}`}><ProductVisual key={product.id} product={product} className={styles.spotlightMedia}/><div className={styles.spotlightContent}><p className={styles.spotlightEyebrow}>{presentation.brand ?? product.category}</p><h3>{product.name}</h3><ServerPrice product={product}/>{product.inStock && <p className={styles.spotlightAvailability}>In stock</p>}</div></a><div className={styles.spotlightActions}><a className={styles.spotlightViewLink} href={`/products/${product.slug}`}>View product</a><button className={styles.spotlightAddButton} type="button" onClick={() => void addToCart(product)} disabled={!product.inStock || cartAdd?.state === "pending"} aria-busy={cartAdd?.state === "pending"}>{cartAdd?.state === "pending" ? "Adding…" : product.inStock ? "Add to bag" : "Out of stock"}</button></div></article>; })}</div></section>}

    {flashDeals.length > 0 && <section className={`deal-showcase shell ${styles.flashDeals}`} aria-labelledby="flash-deals-heading"><div className="marketplace-section-head"><div><p className="eyebrow">Current prices</p><h2 id="flash-deals-heading">Flash Deals</h2><p className={styles.discoverySectionCopy}>Products showing a returned effective price.</p></div><a className="text-link" href="/deals">View active deals <ArrowUpRight size={16}/></a></div><div className={styles.discoveryProductGrid}>{flashDeals.map((product) => <DiscoveryProductCard key={product.id} product={product} cartAdd={cartAdds[product.id]} wishlistSave={wishlistSaves[product.id]} onAdd={() => void addToCart(product)} onSave={() => void saveWishlist(product.id)} showRegularPrice/>)}</div></section>}

    <section className="new-arrivals shell" aria-labelledby="new-arrivals-heading"><div className="marketplace-section-head"><div><p className="eyebrow">Just landed</p><h2 id="new-arrivals-heading">New arrivals</h2><p className={styles.discoverySectionCopy}>The latest returned catalog records.</p></div><a className="text-link" href="#collection">Browse all products <ArrowUpRight size={16}/></a></div>{newArrivalsState === "loading" ? <p className="marketplace-load-state" role="status">Loading new arrivals…</p> : newArrivalsState === "error" ? <p className="marketplace-load-state" role="alert">New arrivals are temporarily unavailable. <button type="button" onClick={() => setNewArrivalsReloadNonce((value) => value + 1)}>Retry new arrivals</button></p> : newArrivals.length === 0 ? <p className="marketplace-load-state" role="status">No new arrivals are available right now.</p> : <div className={styles.discoveryProductGrid}>{newArrivals.slice(0, 8).map((product) => <DiscoveryProductCard key={product.id} product={product} cartAdd={cartAdds[product.id]} wishlistSave={wishlistSaves[product.id]} onAdd={() => void addToCart(product)} onSave={() => void saveWishlist(product.id)}/>)}</div>}</section>

    {taxonomy.brands.length > 0 && <section className={`brand-showcase ${styles.brandShowcase}`} aria-labelledby="brand-discovery-heading"><div className={`shell ${styles.brandShowcaseInner}`}><div className={styles.brandIntro}><p className="eyebrow">Shop by brand</p><h2 id="brand-discovery-heading">Explore brands in the catalog</h2><p>Choose a brand to refine the current catalog.</p></div><div className={styles.brandMarquee} role="group" aria-label="Explore brands"><div className={styles.brandTrack}><div className={styles.brandSequence}>{taxonomy.brands.map((item) => <button key={item.id} type="button" className={`${styles.brandChip} ${brand === item.slug ? "active" : ""}`} aria-pressed={brand === item.slug} onClick={() => { setCatalogLoaded(false); setBrand(brand === item.slug ? "" : item.slug); scrollToCollection(); }}>{item.name}</button>)}</div><div className={styles.brandDuplicateSequence} aria-hidden="true">{taxonomy.brands.map((item) => <span key={`duplicate-${item.id}`} className={`${styles.brandDuplicate} ${brand === item.slug ? styles.brandDuplicateActive : ""}`}>{item.name}</span>)}</div></div></div></div></section>}

    <section id="collection" className="collection shell customer-collection reference-explore-content">
      <div className="section-heading reference-collection-heading"><div><p className="eyebrow">Catalog</p><h2 id="collection-heading" ref={collectionHeadingRef} tabIndex={-1}>Browse catalog products.</h2></div><p>Filter products by department, subcategory, brand, or newest arrivals.</p></div>
      <div className="catalog-tools taxonomy-discovery reference-facet-rail" role="region" aria-label="Product search and filters">
        <div className={styles.sidebarHeader}><p className="eyebrow">Collection</p><h2 id="filter-products-heading">Filter products</h2><p className="catalog-context">{hasActiveCatalogFilter ? "Showing your filtered results" : "All catalog products"}</p></div>
        <div className={styles.sidebarDiscovery}>
          <section className={styles.sidebarSection} aria-label="Search catalog products"><form className={styles.collectionSearch} role="search" aria-label="Search catalog products" onSubmit={(event) => { event.preventDefault(); scrollToCollection(); }}><label><Search size={17} aria-hidden="true"/><span className="sr-only">Search catalog products</span><input aria-controls="catalog-product-grid" value={query} onChange={(event) => { setCatalogLoaded(false); setQuery(event.target.value); }} placeholder="Search the current catalog" /></label>{query.trim() && <button type="button" onClick={() => { setCatalogLoaded(false); setQuery(""); }}>Clear search</button>}</form></section>
          {taxonomyState === "loading" ? <p className="taxonomy-state" role="status">Loading departments…</p> : taxonomyState === "error" ? <p className="taxonomy-state" role="alert">Unable to load departments. <button type="button" onClick={() => setTaxonomyReloadNonce((value) => value + 1)}>Retry departments</button></p> : taxonomy.categories.length === 0 ? <p className="taxonomy-state" role="status">No departments are available right now.</p> : <>
            <fieldset className={`reference-facet-group ${styles.sidebarSection}`}><legend>Availability</legend>{(["all", "in-stock", "low-stock", "out-of-stock"] as const).map((value) => <label key={value}><input type="radio" name="availability" checked={availability === value} onChange={() => setAvailability(value)} />{value === "all" ? "All" : value.replace("-", " ")}</label>)}</fieldset>
            <fieldset className={styles.sidebarSection}><legend>Category</legend><div className="department-rail" role="group" aria-label="Browse departments"><button className={!category ? "active" : ""} aria-pressed={!category} onClick={() => { setCatalogLoaded(false); setCategory(""); setSubcategory(""); }}>All departments</button>{taxonomy.categories.map((item) => <button key={item.id} className={category === item.name ? "active" : ""} aria-pressed={category === item.name} onClick={() => { setCatalogLoaded(false); setCategory(item.name); setSubcategory(""); }}>{item.name}</button>)}</div></fieldset>
            <fieldset className={`reference-facet-group ${styles.sidebarSection}`}><legend>Product type</legend>{(["all", "standard", "variant-based"] as const).map((value) => <label key={value}><input type="radio" name="product-type" checked={productType === value} onChange={() => setProductType(value)} />{value === "all" ? "All" : value.replace("-", " ")}</label>)}</fieldset>
            <div className={`taxonomy-controls ${styles.sidebarSection}`}><label>Subcategory<select aria-label="Subcategory" value={subcategory} disabled={!category} onChange={(event) => { setCatalogLoaded(false); setSubcategory(event.target.value); }}><option value="">All subcategories</option>{subcategories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><div className="brand-discovery" role="group" aria-label="Discover brands"><span>Explore brands</span>{taxonomy.brands.map((item) => <button key={item.id} className={brand === item.slug ? "active" : ""} aria-pressed={brand === item.slug} onClick={() => { setCatalogLoaded(false); setBrand(brand === item.slug ? "" : item.slug); }}>{item.name}</button>)}</div></div>
          </>}
          {hasActiveCatalogFilter && <div className="applied-facets" aria-label="Applied filters"><span>Applied filters</span>{query.trim() && <button type="button" onClick={() => { setCatalogLoaded(false); setQuery(""); }}>Search: {query.trim()}</button>}{applied.map((item) => <span key={item}>{item}</span>)}<button type="button" onClick={() => { setCatalogLoaded(false); setQuery(""); setCategory(""); setSubcategory(""); setBrand(""); setSort(""); }}>Clear all filters</button></div>}
        </div>
      </div>
      <section className="marketplace-hero reference-collection-hero" aria-labelledby="explore-heading">
        <div className={`${styles.heroCopy} ${styles.heroCopyEnter}`}><p className="eyebrow">NexaMart catalog</p><h1 id="explore-heading">Browse <em>catalog products.</em></h1><p>Search products by department, brand, or keyword.</p><div className={styles.heroActions}><a className="primary-button" href="#collection" onClick={browseCatalog}>Browse products <ArrowUpRight size={18}/></a><a className="text-link" href="#departments">Browse departments</a></div></div>
        <div className={[styles.heroMediaFrame, styles.heroMediaEnter].join(" ")}><HeroDiscoveryCanvas products={heroProducts}/></div>
      </section>
      <div className={styles.catalogWorkspace}>
        <div className="reference-product-toolbar"><div><h2>Products</h2><p className="product-count" aria-live="polite">{productCountLabel}</p></div><div className="reference-product-toolbar-actions" role="group" aria-label="Catalog display controls" aria-controls="catalog-product-grid"><label className="catalog-sort">Sort<select aria-label="Sort catalog" value={sort} onChange={(event) => { setCatalogLoaded(false); setSort(event.target.value === "newest" ? "newest" : ""); }}><option value="">Catalog order</option><option value="newest">Newest arrivals</option></select></label><span className="reference-grid-view" role="img" aria-label="Catalog grid view"><LayoutGrid size={16} aria-hidden="true"/></span></div></div>
        <div className={styles.catalogResults} aria-live="polite" aria-busy={!catalogLoaded && !error}>
      {error ? <div className="message" role="alert" aria-labelledby="catalog-error-heading"><h3 id="catalog-error-heading">Catalog unavailable</h3><p>{error}</p><button type="button" onClick={() => setReloadNonce((value) => value + 1)}>Retry catalog</button></div> : !catalogLoaded ? <p className="marketplace-load-state" role="status">Loading catalog products. Results will appear here.</p> : catalogLoaded && !visibleProducts.length ? <div className="catalog-empty" role="status" aria-live="polite"><h3>{hasActiveCatalogFilter || availability !== "all" || productType !== "all" ? "No matching products." : "No catalog products are available."}</h3>{hasActiveCatalogFilter || availability !== "all" || productType !== "all" ? <><p>Try a different search, department, availability, or product type.</p><button type="button" onClick={() => { setCatalogLoaded(false); setQuery(""); setCategory(""); setSubcategory(""); setBrand(""); setSort(""); setAvailability("all"); setProductType("all"); }}>Clear filters and show all products</button></> : <><p>The current catalog has no products. Retry to check for updates.</p><button type="button" onClick={() => setReloadNonce((value) => value + 1)}>Check catalog again</button></>}</div> : <div id="catalog-product-grid" className="product-grid">{visibleProducts.map((product, index) => {
        const presentation = buildProductPresentation(product);
        const wishlistSave = wishlistSaves[product.id];
        const cartAdd = cartAdds[product.id];
        const variants = product.variants ?? [];
        const variantCount = variants.length;
        const variantStock = variants.reduce((total, variant) => total + variant.stock, 0);
        const availabilityState = !product.inStock ? "out-of-stock" : variantCount > 0 && variantStock <= 5 ? "low-stock" : "in-stock";
        const availabilityLabel = availabilityState === "in-stock" ? "In stock" : availabilityState === "low-stock" ? "Low stock" : "Out of stock";
        return <article className="product-card" key={product.id}>
          <div className="product-image">
            <ProductVisual key={product.id} product={product} priority={index < 3} />
            <div className="product-topline"><span>{presentation.brand ?? presentation.category}</span></div>
          </div>
          <div className="product-copy">
            <div className="product-title"><div><p>{presentation.brand ? `${presentation.brand} · ${presentation.category}` : presentation.category}</p><h3><a href={`/products/${product.slug}`}>{product.name}</a></h3></div><ServerPrice product={product}/></div>
            {presentation.description && <p className="product-description">{presentation.description}</p>}
            <div className="reference-product-details"><div className="reference-variant-summary" aria-label={variantCount ? `${variantCount} available variants` : "Standard product without variants"}><span>Variants</span>{variantCount ? <span className="reference-variant-dots" aria-hidden="true">{Array.from({ length: Math.min(variantCount, 4) }, (_, dotIndex) => <i className="reference-variant-dot" key={dotIndex}/>)}</span> : <span className="reference-variant-none">—</span>}</div>{product.inStock && <div className={`reference-availability is-${availabilityState}`}><span>Availability</span><strong>{availabilityLabel}</strong></div>}</div>
            {presentation.specification && <div className="product-meta"><span>{presentation.specification}</span></div>}
            {wishlistSave?.state === "saving" && <p className="wishlist-save-feedback" role="status">Saving…</p>}
            {wishlistSave?.state === "success" && <p className="wishlist-save-feedback success" role="status">Saved.</p>}
            {wishlistSave?.state === "error" && <p className="wishlist-save-feedback error" role="alert">{wishlistSave.message}</p>}
            {cartAdd?.state === "success" && <p className="cart-add-feedback success" role="status">Added to bag.</p>}
            {cartAdd?.state === "error" && <p className="cart-add-feedback error" role="alert">{cartAdd.message}</p>}
          </div>
          <footer className={styles.productCardFooter}>
            <button className="wishlist-button" aria-label={`Save ${product.name} to saved pieces`} aria-busy={wishlistSave?.state === "saving"} disabled={wishlistSave?.state === "saving"} onClick={() => void saveWishlist(product.id)}><Heart size={17}/><span className="sr-only">{wishlistSave?.state === "saving" ? "Saving…" : `Save ${product.name} to saved pieces`}</span></button>
            <button className="quick-add" disabled={!product.inStock || cartAdd?.state === "pending"} aria-busy={cartAdd?.state === "pending"} onClick={() => void addToCart(product)}>{cartAdd?.state === "pending" ? "Adding…" : product.inStock ? "Add to bag" : "Out of stock"} <Plus size={16}/></button>
          </footer>
        </article>;
      })}</div>}
        </div>
      </div>
    </section>

    <section id="catalog-information" className="statement"><div className="shell statement-inner"><p className="eyebrow">Catalog information</p><h2>Browse the available catalog.</h2><p>Use search and filters to find products by department, subcategory, brand, or arrival order.</p><a href="#collection">Browse products <ArrowUpRight size={18}/></a></div></section>
    <footer id="journal" className={`footer shell ${styles.storefrontFooter}`}><div className={styles.footerIdentity}><a href="#top" aria-label="NexaMart marketplace"><BrandLogo monogram/><span>NexaMart</span></a><p>Explore the current NexaMart catalog.</p></div><nav className={styles.footerNav} aria-label="Catalog links"><h2>Catalog</h2><Link href="/#collection">Browse catalog</Link><Link href="/#departments">Departments</Link><Link href="/#new-arrivals-heading">New arrivals</Link><Link href="/deals">Active deals</Link></nav><nav className={styles.footerNav} aria-label="Marketplace links"><h2>Marketplace</h2><Link href="/stores">Stores</Link><Link href={accountDestination(cart.accountRole)}>Account</Link><Link href={headerWishlistPath(cart.authenticated)}>Saved pieces</Link><button type="button" onClick={(event) => openCart(event.currentTarget)}>Open bag</button></nav><div className={styles.footerCatalogNote}><h2>Catalog information</h2><p>Product details and availability reflect the current catalog response.</p></div></footer>

    {cartOpen && <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="shopping-bag-title" aria-label="Shopping bag" onKeyDown={handleDrawerKeyDown}>
      <button className="drawer-backdrop" type="button" aria-label="Close shopping bag" onClick={closeCart} />
        <div className="drawer-panel">
          <div className="drawer-head"><div><p className="eyebrow">Your selection</p><h2 id="shopping-bag-title">Shopping bag</h2></div><button ref={closeButtonRef} className="icon-button" type="button" aria-label="Close bag" onClick={closeCart}><X/></button></div>
        {cart.cartLoadState.state === "loading" ? <p className="seller-state" role="status">Loading your bag…</p> : cart.cartLoadState.state === "error" ? <div className="checkout-message" role="alert"><p>{cart.cartLoadState.message}</p><button className="account-switch" type="button" onClick={() => void cart.retryCartLoad()}>Retry loading bag</button></div> : cart.items.length ? <>
          <div className="cart-items">{cart.items.map((item) => {
            const quantityUpdate = cart.quantityUpdates[item.id];
            return <div className="cart-item" key={item.id} aria-busy={cart.removingItemId === item.id || quantityUpdate?.state === "pending"}><ProductVisual key={item.id} product={item} className="cart-media"/><div><h3>{item.name}</h3><p><span className="sr-only">Current price: </span>{money.format(item.effectivePrice ?? item.price)}</p><div className="quantity"><button disabled={quantityUpdate?.state === "pending"} onClick={() => void cart.setQuantity(item.id, item.quantity - 1).catch(() => undefined)} aria-label={`Reduce ${item.name}`}><Minus size={14}/></button><span>{item.quantity}</span><button disabled={quantityUpdate?.state === "pending"} onClick={() => void cart.setQuantity(item.id, item.quantity + 1).catch(() => undefined)} aria-label={`Increase ${item.name}`}><Plus size={14}/></button></div>{quantityUpdate?.state === "pending" && <p role="status">Updating…</p>}{quantityUpdate?.state === "error" && <p className="checkout-message" role="alert">{quantityUpdate.message} <button type="button" onClick={() => void cart.retryQuantity(item.id).catch(() => undefined)}>Try again</button></p>}{cartRemovalError?.itemId === item.id && <p className="checkout-message" role="alert">{cartRemovalError.message} <button type="button" onClick={() => void removeCartItem(item)}>Try again</button></p>}</div><button className="remove" disabled={cart.removingItemId === item.id} aria-label={`Remove ${item.name} from bag`} onClick={() => void removeCartItem(item)}>{cart.removingItemId === item.id ? "Removing…" : "Remove"}</button></div>;
          })}</div>
          <div className="summary"><div><span>Subtotal</span><strong>{money.format(cart.subtotal)}</strong></div>{cart.authenticated && <fieldset className="checkout-addresses" disabled={addressLoadState === "idle" || checkoutPending}><legend>Shipping address</legend>{addressLoadState === "idle" && <p role="status">Loading saved addresses…</p>}{addressLoadState === "loaded" && savedAddresses.length === 0 && <p>You have no saved shipping addresses. Add one in Account before placing an order. <a href="/account">Go to Account</a></p>}{addressLoadState === "loaded" && savedAddresses.map((address) => <label key={address.id} className="checkout-address-option"><input type="radio" name="shipping-address" value={address.id} checked={selectedShippingAddressId === address.id} onChange={() => setSelectedShippingAddressId(address.id)} aria-label={`Ship to ${address.recipientName}, ${address.line1}, ${address.city}`} /><span><strong>{address.recipientName}{address.isDefault ? " · Default" : ""}</strong><small>{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}{address.region ? `, ${address.region}` : ""} {address.postalCode ?? ""}</small></span></label>)}{addressLoadState === "error" && <p role="alert">Unable to load saved addresses. Try again. <button type="button" onClick={() => { setAddressLoadState("idle"); setAddressReloadNonce((value) => value + 1); }}>Retry saved addresses</button></p>}</fieldset>}{!cart.authenticated && <p className="checkout-message" role="status">Sign in from Account to select a shipping address and place your order. <a href="/account">Go to Account</a></p>}{checkoutRecovery ? <button className="primary-button full" disabled={checkoutPending} onClick={() => void retryCartCleanup()}>{checkoutPending ? "Clearing bag…" : "Retry cart cleanup"}</button> : <button className="primary-button full" disabled={!checkoutAvailable || checkoutPending} onClick={() => void checkout()}>{checkoutPending ? "Creating order…" : "Place order"} <ArrowUpRight size={18}/></button>}{checkoutMessage && <p className="checkout-message" role="status">{checkoutMessage} {checkoutMessage.startsWith("Sign in") && <a href="/account">Go to Account</a>}</p>}</div>
        </> : <div className="empty"><ShoppingBag size={32}/><h3>Your bag is empty.</h3><p>Add products from the catalog when you are ready.</p><button className="primary-button" type="button" onClick={closeCart}>Explore products</button></div>}
      </div>
    </aside>}
  </main>;
}
