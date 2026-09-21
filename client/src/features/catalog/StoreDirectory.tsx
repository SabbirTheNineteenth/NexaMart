"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");

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
  const visibleStores = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return stores;
    return stores.filter((store) => [store.storeName, store.description ?? ""]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  }, [query, stores]);

  return <main className="store-directory customer-experience orchid-explore" aria-labelledby="stores-heading">
    <a className="storefront-skip-link" href="#stores-heading">Skip to stores</a>
    <ExploreHeader active="stores" />
    <section className={`shell ${styles.surface}`} aria-busy={state === "loading"}>
      <p className="eyebrow">Marketplace sellers</p>
      <h1 id="stores-heading">Stores</h1>
      <p>Explore independent storefronts and their current catalog selections.</p>
      {isLoading ? <div className={`marketplace-load-state ${styles.stateFrame}`} role="status" aria-live="polite"><p>Loading stores…</p></div> : null}
      {state === "error" ? <div className={`marketplace-load-state ${styles.stateFrame}`} role="alert"><p>Stores are temporarily unavailable.</p><button className={styles.action} type="button" onClick={retry}>Retry stores</button></div> : null}
      {state === "loaded" && stores.length === 0 ? <div className={`marketplace-load-state ${styles.stateFrame}`} role="status" aria-live="polite"><p>No stores are available right now.</p><button className={styles.action} type="button" onClick={retry}>Check again</button></div> : null}
      {state === "loaded" && stores.length > 0 ? <>
        <div className={styles.discoveryTools} role="search">
          <label htmlFor="store-search">Find a store</label>
          <div className={styles.searchRow}>
            <input id="store-search" type="search" aria-label="Search stores" placeholder="Search by store name or description" value={query} onChange={(event) => setQuery(event.target.value)} />
            {query ? <button className={styles.clearButton} type="button" onClick={() => setQuery("")}>Clear search</button> : null}
          </div>
          <p aria-live="polite">{visibleStores.length} {visibleStores.length === 1 ? "store" : "stores"} shown</p>
        </div>
        {visibleStores.length === 0 ? <div className={`marketplace-load-state ${styles.stateFrame}`} role="status" aria-live="polite"><p>No stores match your search.</p><button className={styles.action} type="button" onClick={() => setQuery("")}>Clear search</button></div> : state === "loaded" && stores.length > 0 ? <div className={`store-directory-grid ${styles.resultsGrid}`}>{visibleStores.map((store) => <article className={`store-directory-card ${styles.storeCard}`} key={store.storeSlug}>
        <p className="eyebrow">{store.productCount} {store.productCount === 1 ? "product" : "products"}</p>
        <h2><Link href={`/stores/${store.storeSlug}`}>{store.storeName}</Link></h2>
        {store.description ? <p>{store.description}</p> : null}
        <Link className="text-link" href={`/stores/${store.storeSlug}`}>Visit store →</Link>
      </article>)}</div> : null}</> : null}
    </section>
  </main>;
}
