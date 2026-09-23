import { useId } from "react";
import { secondaryText } from "./styles";

interface UrgeScaleProps {
  /** Question shown as the legend (graph copy, already filled). */
  label: string;
  hint?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Show a "Clear" control so an optional rating can go back to unrated. */
  allowClear?: boolean;
  lowLabel?: string;
  highLabel?: string;
}

const POINTS = Array.from({ length: 11 }, (_, i) => i);

/**
 * 0–10 tap scale: eleven big buttons instead of a slider.
 * One tap, no dragging, and every value is a >= 48px target.
 */
export function UrgeScale({
  label,
  hint,
  value,
  onChange,
  allowClear = false,
  lowLabel = "Not at all",
  highLabel = "As strong as it gets",
}: UrgeScaleProps) {
  const hintId = useId();
  return (
    <fieldset className="min-w-0 space-y-3" aria-describedby={hint ? hintId : undefined}>
      <legend className="font-semibold mb-1">{label}</legend>
      {hint && (
        <p id={hintId} className={secondaryText}>
          {hint}
        </p>
      )}
      <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
        {POINTS.map((n) => {
          const selected = value === n;
          return (
            <button
              type="button"
              key={n}
              aria-pressed={selected}
              aria-label={`${n} out of 10`}
              onClick={() => onChange(n)}
              className={`min-h-12 min-w-0 rounded-xl border text-lg font-semibold tabular-nums motion-safe:transition-colors disabled:opacity-50 ${
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-primary)] lift-secondary"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className={`flex justify-between gap-3 text-xs ${secondaryText}`} aria-hidden="true">
        <span>0 · {lowLabel}</span>
        <span>10 · {highLabel}</span>
      </div>
      {allowClear && value !== null && (
        <button
          type="button"
          className="min-h-11 px-2 text-sm underline underline-offset-4 text-[var(--color-text-secondary)]"
          onClick={() => onChange(null)}
        >
          Clear this rating
        </button>
      )}
    </fieldset>
  );
}
