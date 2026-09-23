import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

export default function RootLoading() {
  return <main className="app-state-shell" aria-busy="true" aria-live="polite">
    <div className="app-state-card">
      <span className="app-state-kicker">NexaMart</span>
      <SkeletonText className="app-state-skeleton--title" />
      <SkeletonText className="app-state-skeleton--copy" />
      <SkeletonCard />
      <span className="sr-only">Loading NexaMart</span>
    </div>
  </main>;
}
