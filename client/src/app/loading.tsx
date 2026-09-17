export default function RootLoading() {
  return <main className="app-state-shell" aria-busy="true" aria-live="polite">
    <div className="app-state-card">
      <span className="app-state-kicker">NexaMart</span>
      <div className="app-state-skeleton app-state-skeleton--title" />
      <div className="app-state-skeleton app-state-skeleton--copy" />
      <div className="app-state-skeleton app-state-skeleton--copy short" />
      <span className="sr-only">Loading NexaMart</span>
    </div>
  </main>;
}
