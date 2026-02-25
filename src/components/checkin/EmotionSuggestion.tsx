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

  function chipStyle(suggestion: ScoredEmotion) {
    const isSelected = selectedIds.has(suggestion.emotion.id);
    const q = suggestion.emotion.quadrant;
    const styles: Record<string, { base: string; selected: string }> = {
      'high-unpleasant': {
        base: 'bg-red-50 border-red-300 text-red-700',
        selected: 'bg-red-500 border-red-600 text-white shadow-lg',
      },
      'high-pleasant': {
        base: 'bg-amber-50 border-amber-300 text-amber-800',
        selected: 'bg-amber-500 border-amber-600 text-white shadow-lg',
      },
      'low-unpleasant': {
        base: 'bg-blue-50 border-blue-300 text-blue-700',
        selected: 'bg-blue-500 border-blue-600 text-white shadow-lg',
      },
      'low-pleasant': {
        base: 'bg-emerald-50 border-emerald-300 text-emerald-700',
        selected: 'bg-emerald-500 border-emerald-600 text-white shadow-lg',
      },
    };
    const s = styles[q] ?? styles['high-unpleasant'];
    return isSelected ? s.selected : s.base;
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl mb-3 block">🤔</span>
        <h2 className="text-xl font-bold text-[var(--color-sage-800)] mb-2">
          Hmm, I'm not sure yet
        </h2>
        <p className="text-sm text-[var(--color-sage-600)] mb-6">
          Your body is telling you something, but I need a bit more to go on.
          Try picking from the full emotion list instead.
        </p>
        <div className="space-y-3">
          <button
            onClick={onShowAllEmotions}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
          >
            Browse all emotions
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] text-[var(--color-sage-700)] font-medium hover:bg-[var(--color-sage-100)] transition-colors"
          >
            Skip and get help now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        Based on what your body is telling you...
      </h2>
      <p className="text-sm text-[var(--color-sage-600)] text-center mb-6">
        These emotions often show up with those sensations. Tap any that resonate.
      </p>

      <div className="space-y-3 mb-6">
        {suggestions.map((suggestion) => {
          const isSelected = selectedIds.has(suggestion.emotion.id);
          return (
            <button
              key={suggestion.emotion.id}
              onClick={() => toggleEmotion(suggestion.emotion.id)}
              className={`
                w-full text-left p-4 rounded-xl border-2 transition-all duration-150
                active:scale-[0.98]
                ${chipStyle(suggestion)}
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
            w-full py-3 px-4 rounded-lg font-medium transition-colors
            ${selectedIds.size > 0
              ? 'bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white'
              : 'bg-[var(--color-sage-200)] text-[var(--color-sage-500)] cursor-not-allowed'
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
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] text-[var(--color-sage-700)] font-medium hover:bg-[var(--color-sage-100)] transition-colors"
        >
          I feel something else
        </button>

        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-[var(--color-sage-500)] hover:text-[var(--color-sage-700)] transition-colors"
        >
          Skip — just help me now
        </button>
      </div>
    </div>
  );
}
