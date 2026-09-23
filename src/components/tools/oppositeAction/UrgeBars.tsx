interface UrgeBarsProps {
  /** Graph copy already filled, e.g. "Pull to freeze". */
  pullLabel: string;
  from: number;
  to: number | null;
  fromLabel: string;
  toLabel: string;
  /** "large" is the headline (drop >= 2); "compact" sits under a behavior-fact headline. */
  size?: "large" | "compact";
}

function Bar({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-semibold tabular-nums">{value}/10</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden" aria-hidden="true">
        <div
          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 ${
            muted ? "bg-[var(--color-text-secondary)]" : "bg-[var(--color-accent)]"
          }`}
          style={{ width: `${Math.max(value * 10, 2)}%` }}
        />
      </div>
    </div>
  );
}

/** Urge "before → after" with two simple bars. */
export function UrgeBars({ pullLabel, from, to, fromLabel, toLabel, size = "large" }: UrgeBarsProps) {
  const large = size === "large";
  return (
    <div className={large ? "space-y-3" : "space-y-2"}>
      <p className={large ? "text-2xl font-semibold leading-tight" : "text-sm font-medium"}>
        {pullLabel}:{" "}
        <span className="tabular-nums whitespace-nowrap">
          {from}
          {to !== null && <> → {to}</>}
        </span>
      </p>
      <Bar label={fromLabel} value={from} muted={to !== null} />
      {to !== null && <Bar label={toLabel} value={to} />}
    </div>
  );
}
