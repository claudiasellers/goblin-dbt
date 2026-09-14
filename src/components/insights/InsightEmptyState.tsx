import { Link } from 'react-router-dom';

export function InsightEmptyState() {
  return (
    <div
      className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-10 text-center"
      style={{ animation: 'fadeIn 0.5s var(--ease-default)' }}
    >
      <div className="text-4xl mb-4">🌱</div>
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        Your insights are growing
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto mb-6">
        After a few more check-ins, patterns will start to emerge here — what your nervous system
        tends to do, what helps, and what to watch for. No rush.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent-fill)] text-white text-sm font-medium lift-primary"
      >
        Check in now
      </Link>
    </div>
  );
}
