import { useState, useMemo, useEffect } from 'react';
import {
  getEmotionsByQuadrant,
  getEmotionById,
  getEmotionByName,
  getOppositeEmotionIds,
  getRelatedEmotionIds,
  quadrantColors,
} from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface EmotionGridProps {
  quadrant: string;
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
  showRelated?: boolean;
}

// Quadrant-specific styles for bubbles (uses CSS variables for theme consistency)
const quadrantBubbleStyles: Record<string, {
  base: string; selected: string; text: string; selectedText: string;
  borderHover: string; shadow: string;
}> = {
  'high-unpleasant': {
    base: 'bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]',
    selected: 'bg-[var(--color-quadrant-high-unpleasant)] border border-transparent',
    text: 'text-[var(--color-q-hu-text)]',
    selectedText: 'text-white',
    borderHover: 'var(--color-q-hu-border-hover)',
    shadow: 'var(--color-q-hu-shadow)',
  },
  'high-pleasant': {
    base: 'bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)]',
    selected: 'bg-[var(--color-quadrant-high-pleasant)] border border-transparent',
    text: 'text-[var(--color-q-hp-text)]',
    selectedText: 'text-white',
    borderHover: 'var(--color-q-hp-border-hover)',
    shadow: 'var(--color-q-hp-shadow)',
  },
  'low-unpleasant': {
    base: 'bg-[var(--color-q-lu-bg)] border border-[var(--color-q-lu-border)]',
    selected: 'bg-[var(--color-quadrant-low-unpleasant)] border border-transparent',
    text: 'text-[var(--color-q-lu-text)]',
    selectedText: 'text-white',
    borderHover: 'var(--color-q-lu-border-hover)',
    shadow: 'var(--color-q-lu-shadow)',
  },
  'low-pleasant': {
    base: 'bg-[var(--color-q-lp-bg)] border border-[var(--color-q-lp-border)]',
    selected: 'bg-[var(--color-quadrant-low-pleasant)] border border-transparent',
    text: 'text-[var(--color-q-lp-text)]',
    selectedText: 'text-white',
    borderHover: 'var(--color-q-lp-border-hover)',
    shadow: 'var(--color-q-lp-shadow)',
  },
};

export function EmotionGrid({ quadrant, onSelect, onHelpMeNow, showRelated = false }: EmotionGridProps) {
  const [search, setSearch] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);

  const emotions = useMemo(() => getEmotionsByQuadrant(quadrant), [quadrant]);
  const colors = quadrantColors[quadrant];
  const bubbleStyle = quadrantBubbleStyles[quadrant] || quadrantBubbleStyles['high-unpleasant'];

  // Fetch related emotions when the first emotion is selected
  useEffect(() => {
    if (!showRelated || selectedEmotions.length === 0) {
      return;
    }

    const firstEmotion = selectedEmotions[0];
    const selectedEmotion = getEmotionByName(firstEmotion);
    const emotionId = selectedEmotion?.id ?? firstEmotion.toLowerCase().replace(/\s+/g, '_');
    const localRelatedIds = getRelatedEmotionIds(emotionId);
    const localOppositeIds = getOppositeEmotionIds(emotionId);
    const localSuggestions: RelatedEmotion[] = [
      ...localRelatedIds.map(id => {
        const emotion = getEmotionById(id);
        return {
          id,
          name: emotion?.name ?? id.replace(/_/g, ' '),
          reason: 'related feeling',
        };
      }),
      ...localOppositeIds.map(id => {
        const emotion = getEmotionById(id);
        return {
          id,
          name: emotion?.name ?? id.replace(/_/g, ' '),
          reason: 'opposite emotion',
        };
      }),
    ];

    getRelatedEmotions(emotionId, quadrant)
      .then(related => {
        const merged = [...localSuggestions, ...related];
        const deduped = Array.from(
          new Map(merged.map(item => [item.id, item])).values()
        );
        const filtered = deduped.filter(r => {
          const formattedName = formatEmotionName(r.name);
          return !selectedEmotions.some(
            s => s.toLowerCase() === formattedName.toLowerCase()
          );
        });
        setRelatedEmotions(filtered);
      })
      .catch(err => {
        console.error('Failed to get related emotions:', err);
        setRelatedEmotions(localSuggestions);
      });
  }, [selectedEmotions, showRelated, quadrant]);

  const filteredEmotions = useMemo(() => {
    if (!search.trim()) return emotions;
    const query = search.toLowerCase();
    return emotions.filter(e => e.name.toLowerCase().includes(query));
  }, [emotions, search]);

  function toggleEmotion(emotionName: string) {
    setSelectedEmotions(prev => {
      if (prev.includes(emotionName)) {
        return prev.filter(e => e !== emotionName);
      } else {
        return [...prev, emotionName];
      }
    });
  }

  function addRelatedEmotion(emotion: RelatedEmotion) {
    const formattedName = emotion.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    if (!selectedEmotions.includes(formattedName)) {
      setSelectedEmotions(prev => [...prev, formattedName]);
    }
    setRelatedEmotions(prev => prev.filter(r => r.id !== emotion.id));
  }

  function handleAddCustom() {
    const customEmotion = search.trim();
    if (customEmotion && !selectedEmotions.includes(customEmotion)) {
      setSelectedEmotions(prev => [...prev, customEmotion]);
      setSearch('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault();
      handleAddCustom();
    }
  }

  function handleContinue() {
    if (selectedEmotions.length > 0) {
      onSelect(selectedEmotions);
    }
  }

  const searchMatchesExisting = emotions.some(
    e => e.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-2">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
        Tap all that apply
      </p>

      {/* Selected emotions chips */}
      {selectedEmotions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-[var(--color-bg-elevated)] rounded-lg">
          {selectedEmotions.map((emotion) => (
            <span
              key={emotion}
              className={`
                ${colors.bg} ${colors.text}
                py-1 px-3 rounded-full text-sm font-medium
                flex items-center gap-1
              `}
            >
              {emotion}
              <button
                onClick={() => toggleEmotion(emotion)}
                className="ml-1 hover:opacity-70"
                aria-label={`Remove ${emotion}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Related emotions suggestion */}
      {showRelated && selectedEmotions.length > 0 && (
        <div className="mb-4">
          {relatedEmotions.length > 0 ? (
            <div className="p-3 rounded-lg bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)]">
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                Some people who feel <strong>{selectedEmotions[0].toLowerCase()}</strong> also describe:
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedEmotions.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => addRelatedEmotion(related)}
                    className="group flex items-center gap-1 py-1.5 px-3 rounded-full text-sm
                      bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)]
                      lift-secondary"
                  >
                    <span>{formatEmotionName(related.name)}</span>
                    <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
                      +
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                Tap to add · {relatedEmotions[0]?.reason}
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Search input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search or type your own..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 pr-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          {search.trim() && !searchMatchesExisting && (
            <button
              onClick={handleAddCustom}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm bg-[var(--color-accent)] text-white rounded-md lift-primary"
            >
              Add
            </button>
          )}
        </div>
        {search.trim() && !searchMatchesExisting && (
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            Press Enter to add "{search.trim()}"
          </p>
        )}
      </div>

      {/* Emotion bubbles — How We Feel style */}
      <div className="flex flex-wrap justify-center gap-2 max-h-[340px] overflow-y-auto py-2">
        {filteredEmotions.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion.name);
          return (
            <button
              key={emotion.id}
              type="button"
              onClick={() => toggleEmotion(emotion.name)}
              style={!isSelected ? {
                ['--chip-border-hover' as string]: bubbleStyle.borderHover,
                ['--chip-shadow' as string]: bubbleStyle.shadow,
              } : undefined}
              className={`
                py-3 px-5 rounded-full text-sm font-medium
                cursor-pointer select-none
                ${isSelected
                  ? `${bubbleStyle.selected} ${bubbleStyle.selectedText} transition-colors duration-150`
                  : `${bubbleStyle.base} ${bubbleStyle.text} lift-chip`
                }
              `}
            >
              {emotion.name}
            </button>
          );
        })}
      </div>

      {filteredEmotions.length === 0 && !search.trim() && (
        <p className="text-center text-[var(--color-text-tertiary)] mt-4">
          No emotions in this category
        </p>
      )}

      {filteredEmotions.length === 0 && search.trim() && (
        <p className="text-center text-[var(--color-text-tertiary)] mt-4">
          No matches — click Add to use "{search}"
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex gap-3">
        {onHelpMeNow && (
          <button
            onClick={onHelpMeNow}
            className="flex-1 py-3 px-4 rounded-lg border border-dashed border-[var(--color-border-accent)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Help me now
          </button>
        )}
        <button
          onClick={handleContinue}
          className={`
            flex-1 py-3 px-4 rounded-lg font-medium
            ${selectedEmotions.length > 0
              ? 'bg-[var(--color-accent)] text-white lift-primary'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] transition-colors'}
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function formatEmotionName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
