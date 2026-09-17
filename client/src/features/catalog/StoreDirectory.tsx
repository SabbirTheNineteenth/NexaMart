"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExploreHeader } from "@/components/ExploreHeader";
import styles from "./StoreDirectory.module.css";
import { getJSON } from "@/lib/api";
import type { PublicStore } from "@/types/catalog";

type StoreDirectoryPayload = { stores: PublicStore[] };
type StoreDirectoryState = "loading" | "loaded" | "error";

export function StoreDirectory() {
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [state, setState] = useState<StoreDirectoryState>("loading");
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getJSON<StoreDirectoryPayload>("/catalog/stores", controller.signal)
      .then(({ stores: nextStores }) => {
        if (controller.signal.aborted) return;
        setStores(nextStores);
        setState("loaded");
      })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, [reloadNonce]);

  const retry = () => { setState("loading"); setReloadNonce((value) => value + 1); };
  const isLoading = state === "loading";

  return <main className="store-directory customer-experience orchid-explore" aria-labelledby="stores-heading">
    <a className="storefront-skip-link" href="#stores-heading">Skip to stores</a>
    <ExploreHeader active="stores" />
    {/*
    <header className="store-page-header deals-topbar">
      <Link className="brand" href="/">NEXA<span>•</span>MART</Link>
      <nav aria-label="Marketplace">
        <Link href="/">Shop</Link>
        <Link href="/deals">Deals</Link>
        <Link aria-current="page" href="/stores">Stores</Link>
        <Link href="/account">Account</Link>
      </nav>
    </header>
    */}
    <section className="shell" aria-busy={state === "loading"}>
      <p className="eyebrow">Marketplace sellers</p>
      <h1 id="stores-heading">Stores</h1>
      <p>Explore independent storefronts and their current catalog selections.</p>
      {isLoading ? <p className="marketplace-load-state" role="status" aria-live="polite">Loading stores…</p> : null}
      {state === "error" ? <p className="marketplace-load-state" role="alert">Stores are temporarily unavailable. <button type="button" onClick={retry}>Retry stores</button></p> : null}
      {state === "loaded" && stores.length === 0 ? <p className="marketplace-load-state" role="status" aria-live="polite">No stores are available right now.</p> : null}
      {state === "loaded" && stores.length > 0 ? <div className={`store-directory-grid ${styles.resultsGrid}`}>{stores.map((store) => <article className={`store-directory-card ${styles.storeCard}`} key={store.storeSlug}>
        <p className="eyebrow">{store.productCount} {store.productCount === 1 ? "product" : "products"}</p>
        <h2><Link href={`/stores/${store.storeSlug}`}>{store.storeName}</Link></h2>
        {store.description ? <p>{store.description}</p> : null}
        <Link className="text-link" href={`/stores/${store.storeSlug}`}>Visit store →</Link>
      </article>)}</div> : null}
    </section>
  </main>;
}
