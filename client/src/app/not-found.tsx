import Link from "next/link";

export default function NotFound() {
  return <main className="app-state-shell">
    <section className="app-state-card" aria-labelledby="not-found-heading">
      <p className="app-state-kicker">404 · Page not found</p>
      <h1 id="not-found-heading">That aisle doesn’t exist.</h1>
      <p>The link may be out of date, or the page may have moved. The marketplace is still here when you’re ready.</p>
      <div className="app-state-actions">
        <Link className="primary-button" href="/">Browse marketplace</Link>
        <Link className="text-link" href="/stores">Discover stores</Link>
      </div>
    </section>
  </main>;
}
