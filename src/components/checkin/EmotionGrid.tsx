import { useState, useMemo, useEffect } from 'react';
import { getEmotionsByQuadrant, quadrantColors } from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface EmotionGridProps {
  quadrant: string;
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
  showRelated?: boolean;
}

// Bubble size classes — vary by name length for visual rhythm
function getBubbleSize(name: string): string {
  const len = name.length;
  if (len <= 3) return 'w-16 h-16 text-xs';
  if (len <= 5) return 'w-20 h-20 text-sm';
  if (len <= 8) return 'w-24 h-24 text-sm';
  return 'w-28 h-28 text-xs';
}

// Quadrant-specific gradient backgrounds for bubbles
const quadrantBubbleStyles: Record<string, { base: string; selected: string; text: string }> = {
  'high-unpleasant': {
    base: 'bg-gradient-to-br from-red-300 to-rose-400',
    selected: 'bg-gradient-to-br from-red-500 to-rose-600 ring-2 ring-red-700 ring-offset-2',
    text: 'text-white',
  },
  'high-pleasant': {
    base: 'bg-gradient-to-br from-yellow-300 to-amber-400',
    selected: 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-2 ring-amber-700 ring-offset-2',
    text: 'text-amber-900',
  },
  'low-unpleasant': {
    base: 'bg-gradient-to-br from-blue-300 to-indigo-400',
    selected: 'bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-indigo-700 ring-offset-2',
    text: 'text-white',
  },
  'low-pleasant': {
    base: 'bg-gradient-to-br from-emerald-300 to-teal-400',
    selected: 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-teal-700 ring-offset-2',
    text: 'text-white',
  },
};

export function EmotionGrid({ quadrant, onSelect, onHelpMeNow, showRelated = false }: EmotionGridProps) {
  const [search, setSearch] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  const emotions = useMemo(() => getEmotionsByQuadrant(quadrant), [quadrant]);
  const colors = quadrantColors[quadrant];
  const bubbleStyle = quadrantBubbleStyles[quadrant] || quadrantBubbleStyles['high-unpleasant'];

  // Fetch related emotions when the first emotion is selected
  useEffect(() => {
    if (!showRelated || selectedEmotions.length === 0) {
      setRelatedEmotions([]);
      return;
    }

    const firstEmotion = selectedEmotions[0];
    const emotionId = firstEmotion.toLowerCase().replace(/\s+/g, '_');

    setLoadingRelated(true);
    getRelatedEmotions(emotionId, quadrant)
      .then(related => {
        const filtered = related.filter(
          r => !selectedEmotions.some(
            s => s.toLowerCase() === r.name.toLowerCase()
          )
        );
        setRelatedEmotions(filtered);
      })
      .catch(err => {
        console.error('Failed to get related emotions:', err);
        setRelatedEmotions([]);
      })
      .finally(() => {
        setLoadingRelated(false);
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
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-sage-600)] text-center mb-4">
        Tap all that apply
      </p>

      {/* Selected emotions chips */}
      {selectedEmotions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-[var(--color-sage-100)] rounded-lg">
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
          {loadingRelated ? (
            <div className="p-3 rounded-lg bg-[var(--color-sage-50)] border border-[var(--color-sage-200)]">
              <p className="text-sm text-[var(--color-sage-500)] text-center">
                Finding related feelings...
              </p>
            </div>
          ) : relatedEmotions.length > 0 ? (
            <div className="p-3 rounded-lg bg-[var(--color-sage-50)] border border-[var(--color-sage-200)]">
              <p className="text-sm text-[var(--color-sage-600)] mb-2">
                Some people who feel <strong>{selectedEmotions[0].toLowerCase()}</strong> also describe:
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedEmotions.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => addRelatedEmotion(related)}
                    className="group flex items-center gap-1 py-1.5 px-3 rounded-full text-sm
                      bg-white border border-[var(--color-sage-300)] text-[var(--color-sage-700)]
                      hover:bg-[var(--color-sage-100)] hover:border-[var(--color-sage-400)]
                      transition-colors"
                  >
                    <span>{formatEmotionName(related.name)}</span>
                    <span className="text-[var(--color-sage-400)] group-hover:text-[var(--color-sage-600)]">
                      +
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-sage-500)] mt-2">
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
            className="w-full p-3 pr-20 rounded-lg border border-[var(--color-sage-300)] bg-white text-[var(--color-sage-800)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
          />
          {search.trim() && !searchMatchesExisting && (
            <button
              onClick={handleAddCustom}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm bg-[var(--color-sage-600)] text-white rounded-md hover:bg-[var(--color-sage-700)] transition-colors"
            >
              Add
            </button>
          )}
        </div>
        {search.trim() && !searchMatchesExisting && (
          <p className="text-xs text-[var(--color-sage-500)] mt-1">
            Press Enter to add "{search.trim()}"
          </p>
        )}
      </div>

      {/* Emotion bubbles — How We Feel style */}
      <div className="flex flex-wrap justify-center items-center gap-2 max-h-[340px] overflow-y-auto py-2 px-1">
        {filteredEmotions.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion.name);
          const sizeClass = getBubbleSize(emotion.name);
          return (
            <button
              key={emotion.id}
              onClick={() => toggleEmotion(emotion.name)}
              className={`
                ${sizeClass}
                ${isSelected ? bubbleStyle.selected : bubbleStyle.base}
                ${bubbleStyle.text}
                rounded-full
                flex items-center justify-center
                font-medium leading-tight text-center
                hover:brightness-110 active:scale-95
                transition-all duration-200
                ${isSelected ? 'shadow-lg scale-105' : 'shadow-md hover:shadow-lg opacity-85 hover:opacity-100'}
              `}
            >
              <span className="px-1">{emotion.name}</span>
            </button>
          );
        })}
      </div>

      {filteredEmotions.length === 0 && !search.trim() && (
        <p className="text-center text-[var(--color-sage-500)] mt-4">
          No emotions in this category
        </p>
      )}

      {filteredEmotions.length === 0 && search.trim() && (
        <p className="text-center text-[var(--color-sage-500)] mt-4">
          No matches — click Add to use "{search}"
        </p>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex gap-3">
        {onHelpMeNow && (
          <button
            onClick={onHelpMeNow}
            className="flex-1 py-3 px-4 rounded-lg border-2 border-dashed border-[var(--color-sage-400)] text-[var(--color-sage-600)] font-medium hover:bg-[var(--color-sage-50)] hover:border-[var(--color-sage-500)] transition-colors"
          >
            Help me now
          </button>
        )}
        <button
          onClick={handleContinue}
          className={`
            flex-1 py-3 px-4 rounded-lg font-medium transition-colors
            ${selectedEmotions.length > 0
              ? 'bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white'
              : 'bg-[var(--color-sage-200)] text-[var(--color-sage-500)]'}
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
