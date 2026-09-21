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
    <section className={`marketplace-hero shell ${styles.hero}`} aria-labelledby="deals-heading">
      <div className={`marketplace-hero-copy ${styles.heroCopy}`}>
        <p className="eyebrow">Catalog selection</p>
        <h1 id="deals-heading">Active deals</h1>
        <p>Products currently returned by the catalog as active deals.</p>
        <div className={`hero-actions ${styles.heroActions}`}><a className="primary-button" href="#deals-collection">View active deals</a><Link className="text-link" href="/">Browse the catalog</Link></div>
      </div>
      <div className={`marketplace-hero-media ${styles.heroMedia}`}>
        {products[0] ? <DealImage product={products[0]} className={`marketplace-hero-image deals-image ${styles.heroImage}`} /> : <div className="hero-placeholder" aria-hidden="true">NEXA</div>}
        <aside className={`marketplace-hero-note ${styles.heroNote}`} aria-label="Active catalog context" aria-live="polite">
          <span>{state === "loading" ? "Checking active deals" : products[0] ? "Current active deal" : "Active deals"}</span>
          <strong>{products[0]?.name ?? (state === "loading" ? "Loading active deals" : "No active deals")}</strong>
          {products[0] ? <small><span className="sr-only">Current price: </span>{money.format(products[0].effectivePrice ?? products[0].price)} / {products[0].category}</small> : state === "loaded" ? <small>Browse the catalog for all products.</small> : null}
        </aside>
      </div>
    </section>
    <section id="deals-collection" className={`collection shell customer-collection ${styles.collectionSection}`} aria-labelledby="deals-collection-heading">
      <div className={`marketplace-section-head ${styles.sectionHead}`}><div><p className="eyebrow">Live catalog state</p><h2 id="deals-collection-heading">Available now</h2></div><Link className="text-link" href="/">Browse all products</Link></div>
      <div className={`deals-collection-state ${styles.collection}`} aria-busy={state === "loading"}>
        {state === "loading" ? <p className={`marketplace-load-state deals-state-frame ${styles.stateFrame}`} role="status" aria-live="polite">Loading active deals...</p> : null}
        {state === "error" ? <p className={`marketplace-load-state deals-state-frame ${styles.stateFrame}`} role="alert">Active deals are temporarily unavailable. <button className={styles.retryButton} type="button" onClick={() => { setState("loading"); setReloadNonce((value) => value + 1); }}>Retry active deals</button></p> : null}
        {state === "loaded" && products.length === 0 ? <div className={`marketplace-load-state deals-state-frame ${styles.stateFrame}`} role="status" aria-live="polite"><p>No active deals are available right now.</p><Link className={styles.catalogLink} href="/">Browse the catalog</Link></div> : null}
        {state === "loaded" && products.length > 0 ? <div className={`deals-results-frame marketplace-rail product-spotlight-rail ${styles.results}`}>{products.map((product) => <article className={`spotlight-card deals-card ${styles.card}`} key={product.id}>
          <Link className={`deals-product-link ${styles.productLink}`} href={`/products/${product.slug}`}><DealImage product={product} className={`product-visual deals-image ${styles.image}`} /><div className={styles.cardCopy}><p>{product.brand ?? product.category}</p><h3>{product.name}</h3><DealPrice product={product} /><p className={styles.dealMeta}>Active now</p></div></Link>
          <p className={styles.confirmation}>Server-confirmed active deal</p>
        </article>)}</div> : null}
      </div>
    </section>
  </main>;
}
