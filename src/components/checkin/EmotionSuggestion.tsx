import { useState, useMemo } from 'react';
import { getSuggestedEmotions, type ScoredEmotion } from '../../data/sensationMappings';

interface BodySensation {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

interface EmotionSuggestionProps {
  bodySensations: BodySensation[];
  onSelect: (emotions: string[], quadrant: string) => void;
  onShowAllEmotions: () => void;
  onSkip: () => void;
}

export function EmotionSuggestion({
  bodySensations,
  onSelect,
  onShowAllEmotions,
  onSkip,
}: EmotionSuggestionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => getSuggestedEmotions(bodySensations),
    [bodySensations]
  );

  function toggleEmotion(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleContinue() {
    const selected = suggestions.filter(s => selectedIds.has(s.emotion.id));
    if (selected.length === 0) return;

    const emotions = selected.map(s => s.emotion.name);
    const quadrant = selected[0].emotion.quadrant;
    onSelect(emotions, quadrant);
  }

  const chipStyles: Record<string, { base: string; selected: string; borderHover: string; shadow: string }> = {
    'high-unpleasant': {
      base: 'bg-[var(--color-q-hu-bg)] border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)]',
      selected: 'bg-[var(--color-quadrant-high-unpleasant)] border-[var(--color-quadrant-high-unpleasant)] text-[var(--color-on-quadrant)]',
      borderHover: 'var(--color-q-hu-border-hover)',
      shadow: 'var(--color-q-hu-shadow)',
    },
    'high-pleasant': {
      base: 'bg-[var(--color-q-hp-bg)] border-[var(--color-q-hp-border)] text-[var(--color-q-hp-text)]',
      selected: 'bg-[var(--color-quadrant-high-pleasant)] border-[var(--color-quadrant-high-pleasant)] text-[var(--color-on-quadrant)]',
      borderHover: 'var(--color-q-hp-border-hover)',
      shadow: 'var(--color-q-hp-shadow)',
    },
    'low-unpleasant': {
      base: 'bg-[var(--color-q-lu-bg)] border-[var(--color-q-lu-border)] text-[var(--color-q-lu-text)]',
      selected: 'bg-[var(--color-quadrant-low-unpleasant)] border-[var(--color-quadrant-low-unpleasant)] text-[var(--color-on-quadrant)]',
      borderHover: 'var(--color-q-lu-border-hover)',
      shadow: 'var(--color-q-lu-shadow)',
    },
    'low-pleasant': {
      base: 'bg-[var(--color-q-lp-bg)] border-[var(--color-q-lp-border)] text-[var(--color-q-lp-text)]',
      selected: 'bg-[var(--color-quadrant-low-pleasant)] border-[var(--color-quadrant-low-pleasant)] text-[var(--color-on-quadrant)]',
      borderHover: 'var(--color-q-lp-border-hover)',
      shadow: 'var(--color-q-lp-shadow)',
    },
  };

  function chipStyle(suggestion: ScoredEmotion) {
    const isSelected = selectedIds.has(suggestion.emotion.id);
    const q = suggestion.emotion.quadrant;
    const s = chipStyles[q] ?? chipStyles['high-unpleasant'];
    return isSelected ? s.selected : s.base;
  }

  function chipHoverVars(suggestion: ScoredEmotion): React.CSSProperties | undefined {
    const isSelected = selectedIds.has(suggestion.emotion.id);
    if (isSelected) return undefined;
    const q = suggestion.emotion.quadrant;
    const s = chipStyles[q] ?? chipStyles['high-unpleasant'];
    return {
      ['--chip-border-hover' as string]: s.borderHover,
      ['--chip-shadow' as string]: s.shadow,
    };
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-3 block">🤔</span>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Hmm, I'm not sure yet
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Your body is telling you something, but I need a bit more to go on.
          Try picking from the full emotion list instead.
        </p>
        <div className="space-y-3">
          <button
            onClick={onShowAllEmotions}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Browse all emotions
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Skip and get help now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-2">
        Based on what your body is telling you...
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6">
        These emotions often show up with those sensations. Tap any that resonate.
      </p>

      <div className="space-y-3 mb-6">
        {suggestions.map((suggestion) => {
          const isSelected = selectedIds.has(suggestion.emotion.id);
          return (
            <button
              key={suggestion.emotion.id}
              onClick={() => toggleEmotion(suggestion.emotion.id)}
              style={chipHoverVars(suggestion)}
              className={`
                w-full text-left p-4 rounded-xl border
                ${chipStyle(suggestion)}
                ${selectedIds.has(suggestion.emotion.id) ? 'transition-colors duration-150' : 'lift-chip'}
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-base">
                    {suggestion.emotion.name}
                  </span>
                  <p className={`text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'opacity-60'}`}>
                    Often felt as {suggestion.reason}
                  </p>
                </div>
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3
                  transition-colors
                  ${isSelected
                    ? 'border-white/50 bg-white/20'
                    : 'border-current opacity-30'
                  }
                `}>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <button
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
          className={`
            w-full py-3 px-4 rounded-lg font-medium
            ${selectedIds.size > 0
              ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] lift-primary'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] cursor-not-allowed transition-colors'
            }
          `}
        >
          {selectedIds.size > 0
            ? `Continue with ${selectedIds.size} emotion${selectedIds.size > 1 ? 's' : ''}`
            : 'Tap an emotion to continue'
          }
        </button>

        <button
          onClick={onShowAllEmotions}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          I feel something else
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Skip — just help me now
        </button>
      </div>
    </div>
  );
}
