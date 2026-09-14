interface ToolLoadingProps {
  label?: string;
}

/** Loading state with an accessible status announcement. */
export function ToolLoading({ label = 'Loading…' }: ToolLoadingProps) {
  return (
    <div role="status" aria-live="polite" className="text-center py-12">
      <div
        aria-hidden="true"
        className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4"
      />
      <p className="text-[var(--color-text-secondary)]">{label}</p>
    </div>
  );
}
