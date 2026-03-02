interface EmotionQuadrantProps {
  onSelect: (quadrant: string) => void;
  onSomaticEntry?: () => void;
}

const quadrants = [
  {
    id: 'high-unpleasant',
    label: 'High Energy\nUnpleasant',
    examples: 'Angry, Anxious, Stressed',
  },
  {
    id: 'high-pleasant',
    label: 'High Energy\nPleasant',
    examples: 'Excited, Joyful, Energized',
  },
  {
    id: 'low-unpleasant',
    label: 'Low Energy\nUnpleasant',
    examples: 'Sad, Tired, Lonely',
  },
  {
    id: 'low-pleasant',
    label: 'Low Energy\nPleasant',
    examples: 'Calm, Relaxed, Peaceful',
  },
];

const quadrantStyles: Record<string, { bg: string; hover: string; border: string; borderHover: string; shadow: string; text: string; dot: string }> = {
  'high-unpleasant': {
    bg: 'var(--color-q-hu-bg)',
    hover: 'var(--color-q-hu-bg-hover)',
    border: 'var(--color-q-hu-border)',
    borderHover: 'var(--color-q-hu-border-hover)',
    shadow: 'var(--color-q-hu-shadow)',
    text: 'var(--color-q-hu-text)',
    dot: 'var(--color-quadrant-high-unpleasant)',
  },
  'high-pleasant': {
    bg: 'var(--color-q-hp-bg)',
    hover: 'var(--color-q-hp-bg-hover)',
    border: 'var(--color-q-hp-border)',
    borderHover: 'var(--color-q-hp-border-hover)',
    shadow: 'var(--color-q-hp-shadow)',
    text: 'var(--color-q-hp-text)',
    dot: 'var(--color-quadrant-high-pleasant)',
  },
  'low-unpleasant': {
    bg: 'var(--color-q-lu-bg)',
    hover: 'var(--color-q-lu-bg-hover)',
    border: 'var(--color-q-lu-border)',
    borderHover: 'var(--color-q-lu-border-hover)',
    shadow: 'var(--color-q-lu-shadow)',
    text: 'var(--color-q-lu-text)',
    dot: 'var(--color-quadrant-low-unpleasant)',
  },
  'low-pleasant': {
    bg: 'var(--color-q-lp-bg)',
    hover: 'var(--color-q-lp-bg-hover)',
    border: 'var(--color-q-lp-border)',
    borderHover: 'var(--color-q-lp-border-hover)',
    shadow: 'var(--color-q-lp-shadow)',
    text: 'var(--color-q-lp-text)',
    dot: 'var(--color-quadrant-low-pleasant)',
  },
};

export function EmotionQuadrant({ onSelect, onSomaticEntry }: EmotionQuadrantProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] text-center mb-2">
        How do you feel right now?
      </h2>
      <p className="text-sm text-[var(--color-text-tertiary)] text-center mb-6">
        Tap the zone that best describes your current state
      </p>

      <div className="max-w-sm mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {quadrants.map((quadrant) => {
            const styles = quadrantStyles[quadrant.id];
            return (
              <button
                key={quadrant.id}
                onClick={() => onSelect(quadrant.id)}
                style={{
                  background: styles.bg,
                  borderColor: styles.border,
                  ['--q-hover-bg' as string]: styles.hover,
                  ['--q-border-hover' as string]: styles.borderHover,
                  ['--q-shadow' as string]: styles.shadow,
                }}
                className="
                  relative py-6 px-5 rounded-2xl
                  border text-left
                  lift-quadrant
                "
              >
                <div
                  className="w-2 h-2 rounded-full mb-3"
                  style={{ background: styles.dot }}
                />
                <span
                  className="font-medium text-sm whitespace-pre-line block mb-1"
                  style={{ color: styles.text }}
                >
                  {quadrant.label}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] leading-tight block">
                  {quadrant.examples}
                </span>
              </button>
            );
          })}
        </div>

        {/* Axis labels */}
        <div className="relative mt-3">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] px-1">
            <span>Unpleasant</span>
            <span>Pleasant</span>
          </div>
        </div>

        {onSomaticEntry && (
          <button
            onClick={onSomaticEntry}
            className="
              w-full mt-6 py-4 px-5 rounded-2xl
              border border-[var(--color-border)] bg-[var(--color-bg-card)]
              text-[var(--color-text-secondary)] font-medium text-sm
              lift-secondary
            "
          >
            I don't know &mdash; start with my body instead
          </button>
        )}
      </div>
    </div>
  );
}
