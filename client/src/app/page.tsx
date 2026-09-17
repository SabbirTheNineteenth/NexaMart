import { Storefront } from "@/features/catalog/Storefront";
import { Suspense } from "react";

export default function HomePage() {
  return <Suspense fallback={<main className="app-state-shell"><p role="status">Loading catalog…</p></main>}><Storefront /></Suspense>;
}
