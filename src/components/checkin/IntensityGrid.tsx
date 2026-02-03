import { useState } from 'react';

interface IntensityGridProps {
  onSelect: (position: { x: number; y: number }) => void;
  initialPosition?: { x: number; y: number };
}

const intensityLevels = [
  { value: 0.9, label: 'Overwhelming', description: 'Hard to think or function' },
  { value: 0.7, label: 'Strong', description: 'Very noticeable, hard to ignore' },
  { value: 0.5, label: 'Moderate', description: 'Clearly present but manageable' },
  { value: 0.3, label: 'Mild', description: 'Noticeable but not intrusive' },
  { value: 0.1, label: 'Subtle', description: 'Barely there, easy to overlook' },
];

export function IntensityGrid({ onSelect, initialPosition }: IntensityGridProps) {
  const [selectedIntensity, setSelectedIntensity] = useState<number>(
    initialPosition?.y ?? 0.5
  );

  function handleSelect(value: number) {
    setSelectedIntensity(value);
  }

  function handleConfirm() {
    // x is set to 0.5 (neutral) since valence is already captured by quadrant
    onSelect({ x: 0.5, y: selectedIntensity });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-3 tracking-normal">
        How intense is this feeling?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
        Select the level that fits best
      </p>

      {/* Intensity options - satin pillow buttons */}
      <div className="space-y-3 mb-6">
        {intensityLevels.map((level) => {
          const isSelected = selectedIntensity === level.value;
          return (
            <button
              key={level.value}
              onClick={() => handleSelect(level.value)}
              className={`
                w-full p-4 rounded-2xl text-left transition-all duration-200
                ${isSelected 
                  ? 'bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white ring-2 ring-[#d4af37] ring-offset-2 shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]' 
                  : 'bg-white/70 backdrop-blur-sm hover:bg-white/90 text-[var(--color-text-primary)] border border-[var(--color-sage-200)] shadow-[0_2px_8px_rgba(155,89,182,0.1),inset_0_2px_4px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_12px_rgba(155,89,182,0.2),inset_0_2px_4px_rgba(255,255,255,0.9)]'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-semibold tracking-normal ${isSelected ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>
                    {level.label}
                  </p>
                  <p className={`text-sm leading-relaxed ${isSelected ? 'text-white/80' : 'text-[var(--color-text-secondary)]'}`}>
                    {level.description}
                  </p>
                </div>
                {isSelected && (
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f9e076] to-[#d4af37] flex items-center justify-center shadow-[0_2px_8px_rgba(212,175,55,0.5)] sparkle">
                    ✨
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button - lavender gradient */}
      <button
        onClick={handleConfirm}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(155,89,182,0.4)]"
      >
        Continue
      </button>
    </div>
  );
}
