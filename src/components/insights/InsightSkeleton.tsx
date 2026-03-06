export function InsightSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Formulation card skeleton */}
      <div className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-7">
        <div className="h-4 w-24 bg-[var(--color-bg-elevated)] rounded mb-4" />
        <div className="h-6 w-3/4 bg-[var(--color-bg-elevated)] rounded mb-3" />
        <div className="h-4 w-full bg-[var(--color-bg-elevated)] rounded mb-2" />
        <div className="h-4 w-5/6 bg-[var(--color-bg-elevated)] rounded mb-4" />
        <div className="h-20 w-full bg-[var(--color-bg-elevated)] rounded-xl" />
      </div>
      {/* Insight cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6">
            <div className="h-3 w-20 bg-[var(--color-bg-elevated)] rounded mb-3" />
            <div className="h-5 w-2/3 bg-[var(--color-bg-elevated)] rounded mb-2" />
            <div className="h-4 w-full bg-[var(--color-bg-elevated)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
