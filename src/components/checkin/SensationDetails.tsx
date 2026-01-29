import { useState } from 'react';
import { sensationTags } from '../../data/bodyRegions';
import { IntensityGrid } from './IntensityGrid';

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
  const [step, setStep] = useState<'intensity' | 'tags'>('intensity');
  const [intensity, setIntensity] = useState<{ x: number; y: number } | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function handleIntensitySelect(pos: { x: number; y: number }) {
    setIntensity(pos);
    setStep('tags');
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }

  function handleComplete() {
    if (!intensity) return;
    
    onComplete({
      x,
      y,
      region,
      intensity,
      tags: selectedTags,
    });
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        My {region} feels...
      </h2>

      {step === 'intensity' && (
        <div className="mt-4">
          <p className="text-sm text-[var(--color-sage-600)] text-center mb-4">
            How intense and pleasant/unpleasant is this sensation?
          </p>
          <IntensityGrid onSelect={handleIntensitySelect} />
        </div>
      )}

      {step === 'tags' && (
        <div className="mt-4">
          <p className="text-sm text-[var(--color-sage-600)] text-center mb-4">
            What words describe this sensation? (optional)
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {sensationTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`
                  py-2 px-4 rounded-full text-sm font-medium transition-all
                  ${selectedTags.includes(tag)
                    ? 'bg-[var(--color-sage-600)] text-white'
                    : 'bg-[var(--color-sage-100)] text-[var(--color-sage-700)] hover:bg-[var(--color-sage-200)]'
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
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
            >
              Add sensation
            </button>
            
            <button
              onClick={onCancel}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] text-[var(--color-sage-700)] font-medium hover:bg-[var(--color-sage-100)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
