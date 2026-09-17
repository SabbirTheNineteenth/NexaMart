"use client";
/* eslint-disable @next/next/no-img-element -- product media is remote and seller-provided */

import Link from "next/link";
import { Heart, LoaderCircle, Search, ShoppingBag, Store, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cartAddError } from "@/features/cart/cart-add-feedback";
import { productImageSource } from "@/features/catalog/product-presentation";
import { recordRecentlyViewedProduct } from "@/features/catalog/recently-viewed";
import { headerWishlistPath } from "@/features/catalog/header-wishlist";
import { useCart } from "@/hooks/useCart";
import { getJSON, postJSON } from "@/lib/api";
import { wishlistSaveError } from "@/features/catalog/wishlist-save";
import { BrandLogo } from "@/components/BrandLogo";
import type { Product } from "@/types/catalog";
import styles from "./ProductDetail.module.css";

type WishlistSaveState = { state: "saving" } | { state: "success" } | { state: "error"; message: string };
type CartAddState = { state: "pending" } | { state: "success" } | { state: "error"; message: string };
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailHeader({ authenticated, totalItems }: { authenticated: boolean; totalItems: number }) {
  return <header className="marketplace-header product-detail-header">
    <div className="shell marketplace-topbar">
      <Link href="/" className="marketplace-brand" aria-label="NexaMart marketplace"><BrandLogo monogram className="marketplace-brand-mark" priority /><span>NexaMart</span></Link>
      <nav className="reference-explore-tabs product-detail-tabs" aria-label="Explore sections"><Link href="/#collection">Shop</Link><Link href="/#departments">Categories</Link><Link href="/?sort=newest">New Arrivals</Link></nav>
      <form className="marketplace-search" action="/" role="search">
        <Search size={17} aria-hidden="true" />
        <label className="sr-only" htmlFor="product-detail-search">Search the marketplace</label>
        <input id="product-detail-search" name="q" type="search" placeholder="Search products, brands, and departments" />
      </form>
      <div className="marketplace-actions">
        <Link className="marketplace-action-icon" href="/stores" aria-label="Browse stores"><Store size={16} aria-hidden="true" /></Link>
        <Link className="marketplace-action-icon" href={headerWishlistPath(authenticated)} aria-label="View saved pieces"><Heart size={16} aria-hidden="true" /></Link>
        <Link className="marketplace-action-icon" href="/account" aria-label="Open account"><UserRound size={16} aria-hidden="true" /></Link>
        <Link className="marketplace-bag" href="/?bag=1" aria-label="Open shopping bag"><ShoppingBag size={18} /><span>Bag{totalItems ? ` ${totalItems}` : ""}</span></Link>
      </div>
    </div>
    <nav className="product-detail-context shell" aria-label="Product navigation"><span className="product-detail-panel-label">01 / Product detail</span><Link href="/#collection">Back to catalog</Link></nav>
  </header>;
}

export function ProductDetail({ slug }: { slug: string }) {
  const [loadedProduct, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [galleryImageFailed, setGalleryImageFailed] = useState(false);
  const [error, setError] = useState("");
  const [detailReloadNonce, setDetailReloadNonce] = useState(0);
  const [detailRetryPending, setDetailRetryPending] = useState(false);
  const [wishlistSave, setWishlistSave] = useState<WishlistSaveState | undefined>(undefined);
  const [cartAdd, setCartAdd] = useState<CartAddState | undefined>(undefined);
  const cart = useCart();
  const requestTokenRef = useRef(0);
  const wishlistSavingRef = useRef(false);
  const wishlistSaveTokenRef = useRef(0);
  const cartAddingRef = useRef(false);
  const cartAddTokenRef = useRef(0);

  let product = loadedProduct;

  useEffect(() => {
    const requestToken = ++requestTokenRef.current;
    wishlistSaveTokenRef.current += 1;
    wishlistSavingRef.current = false;
    cartAddTokenRef.current += 1;
    cartAddingRef.current = false;
    queueMicrotask(() => {
      if (requestTokenRef.current !== requestToken) return;
      setProduct(null);
      setError("");
      setWishlistSave(undefined);
      setCartAdd(undefined);
      setSelectedImage(0);
      setSelectedVariantId(null);
      setGalleryImageFailed(false);
    });

    getJSON<{ product: Product }>(`/catalog/products/${slug}`)
      .then((detail) => {
        if (requestTokenRef.current !== requestToken) return;
        setProduct(detail.product);
        recordRecentlyViewedProduct(detail.product);
        setDetailRetryPending(false);
      })
      .catch((reason: unknown) => {
        if (requestTokenRef.current === requestToken) {
          setError(reason instanceof Error ? reason.message : "Unable to load this product");
          setDetailRetryPending(false);
        }
      });
  }, [detailReloadNonce, slug]);

  const saveWishlist = async () => {
    if (wishlistSavingRef.current) return;
    if (!cart.authenticated) {
      setWishlistSave({ state: "error", message: "Sign in from Account to save pieces." });
      return;
    }
    if (!product || product.slug !== slug) return;
    const saveToken = wishlistSaveTokenRef.current;
    wishlistSavingRef.current = true;
    setWishlistSave({ state: "saving" });
    try {
      await postJSON<void>("/wishlist/items", { productId: product.id });
      if (wishlistSaveTokenRef.current === saveToken) setWishlistSave({ state: "success" });
    } catch (reason) {
      if (wishlistSaveTokenRef.current === saveToken) setWishlistSave({ state: "error", message: wishlistSaveError(reason) });
    } finally {
      if (wishlistSaveTokenRef.current === saveToken) wishlistSavingRef.current = false;
    }
  };

  const addToCart = async () => {
    if (!product || product.slug !== slug) return;
    if (cartAddingRef.current) return;
    if (!(selectedVariant ? selectedVariant.stock > 0 : product.inStock)) {
      setCartAdd({ state: "error", message: "This product or selected variant is no longer available. Choose an in-stock variant and try again." });
      return;
    }
    const addToken = cartAddTokenRef.current;
    cartAddingRef.current = true;
    setCartAdd({ state: "pending" });
    try {
      await cart.add(product, selectedVariant ? { id: selectedVariant.id, price: selectedVariant.price } : undefined);
      if (cartAddTokenRef.current === addToken) setCartAdd({ state: "success" });
    } catch (reason) {
      if (cartAddTokenRef.current === addToken) setCartAdd({ state: "error", message: cartAddError(reason) });
    } finally {
      if (cartAddTokenRef.current === addToken) cartAddingRef.current = false;
    }
  };

  const currentProduct = product?.slug === slug ? product : null;
  if (error) return <main className="product-detail-shell orchid-explore"><DetailHeader authenticated={cart.authenticated} totalItems={cart.totalItems} /><section className="product-detail-state" aria-label="Product loading error"><div className="message" role="alert"><p>{error}</p><button type="button" disabled={detailRetryPending} aria-busy={detailRetryPending} onClick={() => { setDetailRetryPending(true); setDetailReloadNonce((value) => value + 1); }}>{detailRetryPending ? "Retrying product\u2026" : "Try again"}</button></div></section></main>;
  if (!currentProduct) return <main className="product-detail-shell orchid-explore"><DetailHeader authenticated={cart.authenticated} totalItems={cart.totalItems} /><section className="product-detail-state" aria-label="Product loading"><p className="seller-state" role="status">Loading product\u2026</p></section></main>;
  product = currentProduct;

  const galleryImages = product.galleryImages.length ? product.galleryImages : [{ imageUrl: product.image, altText: product.name, sortOrder: 0 }];
  const currentImage = galleryImages[selectedImage] ?? galleryImages[0];
  const currentImageSource = productImageSource(currentImage?.imageUrl, product.id);
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const purchasable = selectedVariant ? selectedVariant.stock > 0 : product.inStock;
  const displayedPrice = selectedVariant?.price ?? product.effectivePrice ?? product.price;
  product = { ...product, inStock: purchasable };

  return <main className="product-detail-shell orchid-explore" aria-labelledby="product-detail-heading">
    <DetailHeader authenticated={cart.authenticated} totalItems={cart.totalItems} />
    <section className="product-detail">
      <div className="product-detail-media">
        <div className="product-gallery" aria-label="Product images">
          {!currentImageSource || galleryImageFailed ? <div className="product-gallery-main product-visual-fallback" role="img" aria-label={`${product.name} product image unavailable`}><span aria-hidden="true">NM</span></div> : <img className="product-gallery-main" src={currentImageSource} alt={currentImage?.altText ?? product.name} onError={() => setGalleryImageFailed(true)} />}
          {galleryImages.length > 1 && <div className="product-gallery-thumbnails">{galleryImages.map((image, index) => <button key={`${image.imageUrl}-${image.sortOrder}`} type="button" className={selectedImage === index ? "is-selected" : ""} aria-label={`View image ${index + 1}: ${image.altText ?? product.name}`} aria-pressed={selectedImage === index} onClick={() => { setGalleryImageFailed(false); setSelectedImage(index); }}><img src={productImageSource(image.imageUrl, product.id)} alt="" /></button>)}</div>}
        </div>
      </div>
      <aside className="product-detail-copy product-detail-summary" aria-label="Product summary">
        <p className="eyebrow">{product.brand ?? product.category}</p>
        <h1 id="product-detail-heading">{product.name}</h1>
        <p>{product.description}</p>
        <dl className={`product-detail-facts ${styles.facts}`}><div><dt>Availability</dt><dd>{purchasable ? "In stock" : "Currently unavailable"}</dd></div><div><dt>Category</dt><dd>{product.category}</dd></div></dl>
        {product.variants.length > 0 && <section className={`product-variants ${styles.variantPanel}`} aria-labelledby="variant-availability-heading">
          <h2 id="variant-availability-heading">Available variants</h2>
          <p>Select a variant to use its own current price and stock when adding it to your bag.</p>
          <div className="product-variant-selector" role="group" aria-label="Choose a variant">{product.variants.map((variant) => <button key={variant.id} type="button" className={selectedVariantId === variant.id ? "is-selected" : ""} aria-pressed={selectedVariantId === variant.id} onClick={() => setSelectedVariantId(variant.id)}>{Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(" / ") || variant.sku}</button>)}</div>
          {selectedVariant && <p className="product-selected-configuration" role="status">Selected configuration: <strong>{selectedVariant.sku}</strong> \u00c2\u00b7 {money.format(displayedPrice)} \u00c2\u00b7 {selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : "Out of stock"}</p>}
          <ul>{product.variants.map((variant) => <li key={variant.sku}><div><strong>{variant.sku}</strong><span>{Object.entries(variant.options).map(([name, value]) => `${name}: ${value}`).join(" \u00c2\u00b7 ") || "Standard"}</span></div><div><strong>{money.format(variant.price)}</strong><span>{variant.stock > 0 ? `${variant.stock} in stock` : "Out of stock"}</span></div></li>)}</ul>
        </section>}
        <section className="product-purchase-panel" aria-label="Purchase options"><div className="product-detail-price"><strong>{money.format(displayedPrice)}</strong></div><div className="product-detail-actions"><button className="primary-button" disabled={!product.inStock || cartAdd?.state === "pending"} aria-busy={cartAdd?.state === "pending"} onClick={() => void addToCart()}><ShoppingBag size={17} /> {cartAdd?.state === "pending" ? "Adding\u2026" : product.inStock ? "Add to bag" : "Out of stock"}</button><button className="icon-button" aria-label={wishlistSave?.state === "saving" ? `Saving ${product.name} to saved pieces` : `Save ${product.name} to saved pieces`} aria-busy={wishlistSave?.state === "saving"} disabled={wishlistSave?.state === "saving"} onClick={() => void saveWishlist()}>{wishlistSave?.state === "saving" ? <LoaderCircle className="wishlist-save-indicator" aria-hidden="true" size={18} /> : <Heart size={18} aria-hidden="true" />}<span className="sr-only">{wishlistSave?.state === "saving" ? "Saving…" : `Save ${product.name} to saved pieces`}</span></button></div>
        {(cartAdd || wishlistSave) && <div className="product-purchase-feedback">
          {cartAdd?.state === "success" && <p className="cart-add-feedback success" role="status">Added to bag. <Link href="/?bag=1">View bag and checkout</Link></p>}
          {cartAdd?.state === "error" && <p className="cart-add-feedback error" role="alert">{cartAdd.message}</p>}
          {wishlistSave?.state === "saving" && <p className="wishlist-save-feedback" role="status">Saving…</p>}
          {wishlistSave?.state === "success" && <p className="wishlist-save-feedback success" role="status">Saved.</p>}
          {wishlistSave?.state === "error" && <p className="wishlist-save-feedback error" role="alert">{wishlistSave.message}</p>}
        </div>}</section>
      </aside>
    </section>
  </main>;
}
