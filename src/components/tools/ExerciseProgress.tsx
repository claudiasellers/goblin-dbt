import { useEffect, useRef } from 'react';

interface ExerciseProgressProps {
  /** 1-based index of the current stage. */
  current: number;
  total: number;
  /** Short name of the current stage, e.g. "Touch". */
  stageName: string;
  onBack?: () => void;
}

/**
 * Shared exercise frame header: visible progress ("Step 2 of 5: Touch"),
 * an in-app Back control, and an aria-live announcement so screen readers
 * hear the new stage after navigation.
 */
export function ExerciseProgress({ current, total, stageName, onBack }: ExerciseProgressProps) {
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Move focus to the progress line so the new stage is announced and
    // keyboard users land at the top of the stage.
    liveRef.current?.focus();
  }, [current]);

  return (
    <div className="flex items-center justify-between gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 min-h-11 px-2 -ml-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>
      ) : (
        <span />
      )}
      <p
        ref={liveRef}
        tabIndex={-1}
        aria-live="polite"
        style={{ outline: 'none' }}
        className="text-sm font-medium text-[var(--color-text-secondary)]"
      >
        Step {current} of {total}: {stageName}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < current ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
