import type { TimeRange } from './useFilteredCheckIns';

const options: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
];

interface TimeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeFilter({ value, onChange }: TimeFilterProps) {
  return (
    <div className="flex gap-1 bg-[var(--color-bg-elevated)] rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
