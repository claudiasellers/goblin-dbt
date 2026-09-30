import { useState } from 'react';
import { sensationTags } from '../../data/bodyRegions';

interface BodySensation {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

interface SensationDetailsProps {
  x: number;
  y: number;
  region: string;
  onComplete: (sensation: BodySensation) => void;
  onCancel: () => void;
}

export function SensationDetails({ x, y, region, onComplete, onCancel }: SensationDetailsProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }

  function handleComplete() {
    onComplete({
      x,
      y,
      region,
      // Default intensity — no longer asked as a separate step
      intensity: { x: 0.5, y: 0.5 },
      tags: selectedTags,
    });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-2">
        My {region} feels...
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
        What words describe this sensation?
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {sensationTags.map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`
              py-2 px-4 rounded-full text-sm font-medium transition-all
              ${selectedTags.includes(tag)
                ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]'
                : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] lift-secondary'
              }
            `}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleComplete}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
        >
          Add sensation
        </button>

        <button
          onClick={onCancel}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
