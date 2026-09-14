import { Link } from 'react-router-dom';

interface ToolLoadErrorProps {
  /** Re-runs the failed operation. Should be a no-op while a retry is in flight. */
  onRetry: () => void;
  retrying?: boolean;
  message?: string;
}

/**
 * Actionable failure state for tools that load content from the graph.
 * Never blames the network, the account, or the user — we don't know the cause.
 */
export function ToolLoadError({
  onRetry,
  retrying = false,
  message = "This tool couldn't load. Try again, or choose another tool.",
}: ToolLoadErrorProps) {
  return (
    <div role="alert" className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
      <p className="text-[var(--color-text-primary)] mb-6">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying}
          className="py-3 px-5 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-60"
        >
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
        <Link
          to="/tools"
          className="py-3 px-5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          Back to tools
        </Link>
      </div>
    </div>
  );
}
