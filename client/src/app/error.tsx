"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Preserve a diagnostic signal without exposing implementation details to customers.
    console.error("NexaMart route error", error);
  }, [error]);

  return <main className="app-state-shell">
    <section className="app-state-card" aria-labelledby="route-error-heading">
      <p className="app-state-kicker">Something interrupted your visit</p>
      <h1 id="route-error-heading">We couldn’t load that page.</h1>
      <p>Nothing has been changed. Try again, or return to the marketplace to continue browsing.</p>
      <div className="app-state-actions">
        <button className="primary-button" type="button" onClick={reset}>Try again</button>
        <Link className="text-link" href="/">Return to marketplace</Link>
      </div>
    </section>
  </main>;
}
