"use client";
/* eslint-disable @next/next/no-img-element -- catalog imagery is dynamic and cross-origin by design */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExploreHeader } from "@/components/ExploreHeader";
import { millisecondsUntilNextDealRefresh } from "@/features/catalog/deals-refresh";
import { productImageSource } from "@/features/catalog/product-presentation";
import { getJSON } from "@/lib/api";
import type { Product } from "@/types/catalog";
import styles from "./DealsDiscovery.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
type DealsState = "loading" | "loaded" | "error";

function DealImage({ product, className = "deals-image" }: { product: Pick<Product, "id" | "image" | "name">; className?: string }) {
  const image = productImageSource(product.image, product.id);
  if (!image) return <div className={`${className} deals-image-fallback`} role="img" aria-label={`${product.name} product image unavailable`}>NEXA</div>;
  return <img className={className} src={image} alt={product.name} loading="lazy" />;
}

function DealPrice({ product }: { product: Pick<Product, "price" | "effectivePrice"> }) {
  const price = product.effectivePrice ?? product.price;
  return <p className="deals-price"><span className="sr-only">Current price: </span><strong>{money.format(price)}</strong></p>;
}

export function DealsDiscovery() {
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<DealsState>("loading");
  const [reloadNonce, setReloadNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let refreshTimer: number | undefined;
    getJSON<{ products: Product[] }>("/catalog/products?deals=active", controller.signal)
      .then(({ products: activeDeals }) => {
        if (controller.signal.aborted) return;
        setProducts(activeDeals);
        setState("loaded");
        const refreshAfterMs = millisecondsUntilNextDealRefresh(activeDeals);
        if (refreshAfterMs !== undefined) refreshTimer = window.setTimeout(() => setReloadNonce((value) => value + 1), refreshAfterMs);
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });
    return () => { controller.abort(); if (refreshTimer !== undefined) window.clearTimeout(refreshTimer); };
  }, [reloadNonce]);

  return <main className="deals-discovery customer-experience orchid-explore">
    <a className={`storefront-skip-link ${styles.skipLink}`} href="#deals-heading">Skip to active deals</a>
    <ExploreHeader active="deals" />
    {/*
      <div className="marketplace-utility"><div className="shell"><span>Browse catalog products and stores.</span><div><Link href="/stores">Browse stores</Link><Link href="/register/seller">Sell with NexaMart</Link></div></div></div>
      <div className="shell marketplace-topbar">
        <Link className="brand" href="/">NEXA<span>•</span>MART</Link>
        <form className="marketplace-search" onSubmit={searchCatalog}><Search size={17}/><label className="sr-only" htmlFor="deals-search">Search the marketplace</label><input id="deals-search" aria-label="Search the marketplace" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products, brands, and departments" /></form>
        <div className="marketplace-actions"><Link className="marketplace-account" href="/stores">Stores</Link><Link className="marketplace-account" href="/account">Wishlist</Link><Link className="marketplace-account" href="/account">Account</Link><button className="icon-button mobile-menu-toggle" type="button" aria-label="Toggle explore navigation" aria-expanded={mobileNavOpen} aria-controls="deals-explore-navigation" onClick={() => setMobileNavOpen((open) => !open)}><Menu size={18}/></button><Link className="marketplace-bag" href="/?bag=1" aria-label="Open shopping bag"><ShoppingBag size={18}/><span>Bag</span></Link></div>
      </div>
      <nav id="deals-explore-navigation" className={`marketplace-category-nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Explore navigation"><div className="shell marketplace-rail"><Link href="/" onClick={() => setMobileNavOpen(false)}>Shop</Link><Link aria-current="page" href="/deals" onClick={() => setMobileNavOpen(false)}>Active deals</Link><Link href="/stores" onClick={() => setMobileNavOpen(false)}>Stores</Link><Link className="mobile-marketplace-account" href="/account" onClick={() => setMobileNavOpen(false)}>Wishlist</Link><Link className="mobile-marketplace-account" href="/account" onClick={() => setMobileNavOpen(false)}>Account</Link></div></nav>
    */}
    <section className="marketplace-hero shell" aria-labelledby="deals-heading">
      <div className="marketplace-hero-copy"><p className="eyebrow">Active catalog deals</p>
      <h1 id="deals-heading">Active deals</h1>
      <p>Browse products currently returned by the catalog as active deals.</p><div className="hero-actions"><a className="primary-button" href="#deals-collection">Browse active deals</a><Link className="text-link" href="/">Browse the catalog</Link></div></div>
      <div className="marketplace-hero-media">{products[0] ? <DealImage product={products[0]} className="marketplace-hero-image deals-image"/> : <div className="hero-placeholder" aria-hidden="true">NEXA</div>}<aside className="marketplace-hero-note" aria-label="Active catalog context" aria-live="polite"><span>Current active deal</span><strong>{products[0]?.name ?? (state === "loading" ? "Loading active deals" : "Active deals")}</strong>{products[0] ? <small><span className="sr-only">Current price: </span>{money.format(products[0].effectivePrice ?? products[0].price)} · {products[0].category}</small> : null}</aside></div>
    </section>
    <section id="deals-collection" className="collection shell customer-collection" aria-labelledby="deals-collection-heading">
      <div className="marketplace-section-head"><div><p className="eyebrow">Current catalog pricing</p><h2 id="deals-collection-heading">Active deals</h2></div><Link className="text-link" href="/">Browse all products</Link></div>
      <div className="deals-collection-state" aria-busy={state === "loading"}>
        {state === "loading" ? <p className="marketplace-load-state deals-state-frame" role="status" aria-live="polite">Loading active deals…</p> : null}
        {state === "error" ? <p className="marketplace-load-state deals-state-frame" role="alert">Active deals are temporarily unavailable. <button type="button" onClick={() => { setState("loading"); setReloadNonce((value) => value + 1); }}>Retry active deals</button></p> : null}
        {state === "loaded" && products.length === 0 ? <p className="marketplace-load-state deals-state-frame" role="status" aria-live="polite">No active deals are available right now.</p> : null}
        {state === "loaded" && products.length > 0 ? <div className="deals-results-frame marketplace-rail product-spotlight-rail">{products.map((product) => <article className="spotlight-card deals-card" key={product.id}>
          <Link className="deals-product-link" href={`/products/${product.slug}`}><DealImage product={product} className="product-visual deals-image"/><div><p>{product.brand ?? product.category}</p><h3>{product.name}</h3><DealPrice product={product}/></div></Link>
          <p className="deals-confirmation">Server-confirmed active deal</p>
        </article>)}</div> : null}
      </div>
    </section>
  </main>;
}
