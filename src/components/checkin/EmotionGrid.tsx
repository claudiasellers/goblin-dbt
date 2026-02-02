import { useState, useMemo, useEffect } from 'react';
import { getEmotionsByQuadrant, quadrantColors } from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface EmotionGridProps {
  quadrant: string;
  onSelect: (emotions: string[]) => void;
  showRelated?: boolean;
}

export function EmotionGrid({ quadrant, onSelect, showRelated = false }: EmotionGridProps) {
  const [search, setSearch] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  const emotions = useMemo(() => getEmotionsByQuadrant(quadrant), [quadrant]);
  const colors = quadrantColors[quadrant];

  // Fetch related emotions when the first emotion is selected
  useEffect(() => {
    if (!showRelated || selectedEmotions.length === 0) {
      setRelatedEmotions([]);
      return;
    }

    const firstEmotion = selectedEmotions[0];
    // Convert to graph ID format (lowercase, underscores)
    const emotionId = firstEmotion.toLowerCase().replace(/\s+/g, '_');

    setLoadingRelated(true);
    getRelatedEmotions(emotionId, quadrant)
      .then(related => {
        // Filter out already-selected emotions
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
    // Convert the graph emotion name to title case
    const formattedName = emotion.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    
    if (!selectedEmotions.includes(formattedName)) {
      setSelectedEmotions(prev => [...prev, formattedName]);
    }
    // Remove from related list
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

  // Check if search text matches any existing emotion
  const searchMatchesExisting = emotions.some(
    e => e.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-sage-600)] text-center mb-4">
        Select all that apply, or type your own
      </p>

      {/* Selected emotions display */}
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

      {/* "You might also be feeling..." - vocabulary expansion */}
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

      {/* Search input with add custom option */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search or type your own emotion..."
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
            Press Enter or click Add to add "{search.trim()}" as a custom emotion
          </p>
        )}
      </div>

      {/* Emotion grid */}
      <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
        {filteredEmotions.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion.name);
          return (
            <button
              key={emotion.id}
              onClick={() => toggleEmotion(emotion.name)}
              className={`
                ${colors.bg} ${colors.text}
                py-3 px-2 rounded-full
                text-sm font-medium
                hover:opacity-90 active:scale-95
                transition-all duration-150
                relative
                ${isSelected ? 'ring-2 ring-offset-2 ring-[var(--color-sage-800)]' : 'shadow-md hover:shadow-lg'}
              `}
            >
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-sage-800)] text-white rounded-full text-xs flex items-center justify-center">
                  ✓
                </span>
              )}
              {emotion.name}
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
          No emotions match "{search}" — click Add to use it anyway
        </p>
      )}

      {/* Continue button */}
      <div className="mt-6">
        <button
          onClick={handleContinue}
          disabled={selectedEmotions.length === 0}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-colors
            ${selectedEmotions.length > 0 
              ? 'bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white' 
              : 'bg-[var(--color-sage-200)] text-[var(--color-sage-400)] cursor-not-allowed'}
          `}
        >
          Continue with {selectedEmotions.length || 'no'} emotion{selectedEmotions.length !== 1 ? 's' : ''} selected
        </button>
      </div>
    </div>
  );
}

// Helper to format emotion names from graph format
function formatEmotionName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
