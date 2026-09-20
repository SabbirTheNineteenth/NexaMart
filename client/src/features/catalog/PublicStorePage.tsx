"use client";
/* eslint-disable @next/next/no-img-element -- catalog imagery is remote */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExploreHeader } from "@/components/ExploreHeader";
import { getJSON } from "@/lib/api";
import { productImageSource } from "@/features/catalog/product-presentation";
import type { Product, PublicStore } from "@/types/catalog";
import styles from "./PublicStorePage.module.css";

type PublicStorePayload = { store: PublicStore; products: Product[] };
type PublicStoreState = "loading" | "loaded" | "error";
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/* function StoreHeader() {
  return <header className="deals-header">
    <div className="shell deals-topbar">
      <Link className="brand" href="/">NEXA<span>•</span>MART</Link>
      <nav aria-label="Marketplace">
        <Link href="/">Shop</Link>
        <Link href="/deals">Deals</Link>
        <Link aria-current="page" href="/stores">Stores</Link>
        <Link href="/account">Account</Link>
      </nav>
    </div>
  </header>;
} */

function StoreProductCard({ product }: { product: Product }) {
  const image = productImageSource(product.image, product.id);
  const price = product.effectivePrice ?? product.price;

  return <article className={styles.productCard}>
    <Link href={`/products/${product.slug}`}>
      {image
        ? <img src={image} alt={product.name} loading="lazy" />
        : <span className="store-product-fallback" role="img" aria-label={`${product.name} product image unavailable`}>NM</span>}
      <p className="eyebrow">{product.brand ?? product.category}</p>
      <h3>{product.name}</h3>
      <span className="server-price"><span className="sr-only">Current price: </span><strong>{money.format(price)}</strong></span>
    </Link>
  </article>;
}

function StoreProductCollection({ products, state }: { products: Product[]; state: PublicStoreState }) {
  return <section className={styles.collection} aria-busy={state === "loading"} aria-labelledby="store-products-heading">
    <h2 id="store-products-heading">Available products</h2>
    {products.length === 0
      ? <p className="marketplace-load-state" role="status" aria-live="polite">No products are available from this store right now.</p>
      : <div className={styles.productGrid}>{products.map((product) => <StoreProductCard key={product.id} product={product} />)}</div>}
  </section>;
}

export function PublicStorePage({ slug }: { slug: string }) {
  const [payload, setPayload] = useState<PublicStorePayload | null>(null);
  const [state, setState] = useState<PublicStoreState>("loading");
  const [storeReloadNonce, setStoreReloadNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getJSON<PublicStorePayload>(`/catalog/stores/${slug}`, controller.signal)
      .then((nextPayload) => { setPayload(nextPayload); setState("loaded"); })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [slug, storeReloadNonce]);

  const retry = () => { setPayload(null); setState("loading"); setStoreReloadNonce((value) => value + 1); };
  const currentPayload = payload?.store.storeSlug === slug ? payload : null;
  if (state === "loading" || !currentPayload && state !== "error") return <main className="public-store-page customer-experience orchid-explore">
    <ExploreHeader active="stores" />
    <section className="shell deals-content" aria-label="Store loading" aria-busy="true">
      <div className={styles.stateFrame}>
      <p className="marketplace-load-state" role="status" aria-live="polite">Loading store…</p>
      </div>
    </section>
  </main>;
  if (state === "error" || !currentPayload) return <main className="public-store-page customer-experience orchid-explore">
    <ExploreHeader active="stores" />
    <section className="shell deals-content" aria-labelledby="store-unavailable-heading">
      <div className={styles.stateFrame}><div className="marketplace-load-state" role="alert">
        <p className="eyebrow">Storefront</p>
        <h1 id="store-unavailable-heading">Store unavailable</h1>
        <p>Unable to load this storefront. Try again.</p>
        <button type="button" onClick={retry}>Retry store</button>
      </div></div>
    </section>
  </main>;
  const { store, products } = currentPayload;
  return <main className="public-store-page customer-experience orchid-explore">
    <a className="storefront-skip-link" href="#store-products-heading">Skip to store products</a>
    <ExploreHeader active="stores" />
    <section className={`shell public-store-hero ${styles.storeFrame}`} aria-labelledby="store-heading">
      <p className={styles.context}>01 / Store collection</p>
      <p className="eyebrow">Store collection</p>
      <h1 id="store-heading">{store.storeName}</h1>
      {store.description ? <p>{store.description}</p> : null}
      <small className={styles.productCount}>{store.productCount} {store.productCount === 1 ? "product" : "products"}</small>
    </section>
    <StoreProductCollection products={products} state={state} />
  </main>;
}
