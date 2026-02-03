import { useState, useMemo, useEffect } from 'react';
import { getEmotionsByQuadrant, quadrantColors, emotions as allEmotions } from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface EmotionGridProps {
  quadrant: string;
  onSelect: (emotions: string[]) => void;
  showRelated?: boolean;
  onHelpMeNow?: () => void;
}

export function EmotionGrid({ quadrant, onSelect, showRelated = false, onHelpMeNow }: EmotionGridProps) {
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

    const firstEmotionName = selectedEmotions[0];
    // Look up the graph emotion ID from the emotions data
    const emotionData = allEmotions.find(e => e.name === firstEmotionName);
    const emotionId = emotionData?.id || firstEmotionName.toLowerCase().replace(/\s+/g, '_');

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
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-3 tracking-normal">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4 leading-relaxed">
        Select all that apply, or type your own
      </p>

      {/* Selected emotions display - gold leaf container */}
      {selectedEmotions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-4 rounded-[20px] bg-white/60 backdrop-blur-sm border border-[rgba(212,175,55,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          {selectedEmotions.map((emotion) => (
            <span
              key={emotion}
              className={`
                ${colors.bg} ${colors.text}
                py-1.5 px-4 rounded-full text-sm font-medium
                flex items-center gap-2
                border-2 border-[#d4af37]
                shadow-[0_2px_8px_rgba(212,175,55,0.3),inset_0_1px_2px_rgba(255,255,255,0.5)]
              `}
            >
              <span className="text-[#d4af37]">✨</span>
              {emotion}
              <button
                onClick={() => toggleEmotion(emotion)}
                className="ml-1 hover:opacity-70 text-[var(--color-text-secondary)]"
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
            <div className="p-4 rounded-[20px] bg-white/60 backdrop-blur-sm border border-[rgba(212,175,55,0.2)]">
              <p className="text-sm text-[var(--color-text-secondary)] text-center">
                ✨ Finding related feelings...
              </p>
            </div>
          ) : relatedEmotions.length > 0 ? (
            <div className="p-4 rounded-[20px] bg-white/60 backdrop-blur-sm border border-[rgba(212,175,55,0.2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                Some people who feel <strong className="text-[var(--color-text-primary)]">{selectedEmotions[0].toLowerCase()}</strong> also describe:
              </p>
              <div className="flex flex-wrap gap-2">
                {relatedEmotions.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => addRelatedEmotion(related)}
                    className="group flex items-center gap-1 py-2 px-4 rounded-full text-sm
                      bg-white/80 border border-[var(--color-sage-300)] text-[var(--color-text-secondary)]
                      hover:border-[#d4af37] hover:shadow-[0_0_8px_rgba(212,175,55,0.3)]
                      shadow-[inset_0_1px_2px_rgba(255,255,255,0.8)]
                      transition-all duration-200"
                  >
                    <span>{formatEmotionName(related.name)}</span>
                    <span className="text-[var(--color-sage-400)] group-hover:text-[#d4af37]">
                      +
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-3 opacity-70">
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
            className="w-full p-4 pr-20 rounded-2xl border border-[var(--color-sage-300)] bg-white/80 backdrop-blur-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
          />
          {search.trim() && !searchMatchesExisting && (
            <button
              onClick={handleAddCustom}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 text-sm bg-gradient-to-r from-[#d4af37] to-[#f9e076] text-[var(--color-text-primary)] rounded-full font-medium hover:shadow-[0_0_12px_rgba(212,175,55,0.5)] transition-all"
            >
              Add
            </button>
          )}
        </div>
        {search.trim() && !searchMatchesExisting && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-2 ml-2">
            Press Enter or click Add to add "{search.trim()}" as a custom emotion
          </p>
        )}
      </div>

      {/* Emotion grid - gemstone/pillow buttons */}
      <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
        {filteredEmotions.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion.name);
          return (
            <button
              key={emotion.id}
              onClick={() => toggleEmotion(emotion.name)}
              className={`
                ${colors.bg} ${colors.text}
                py-3 px-3 rounded-2xl
                text-sm font-semibold
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200
                relative
                ${isSelected 
                  ? 'ring-2 ring-[#d4af37] ring-offset-2 shadow-[0_4px_16px_rgba(212,175,55,0.4),inset_0_2px_4px_rgba(255,255,255,0.6)]' 
                  : 'shadow-[0_2px_8px_rgba(155,89,182,0.15),inset_0_2px_4px_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(155,89,182,0.25),inset_0_2px_4px_rgba(255,255,255,0.7)]'
                }
                border border-white/50
              `}
            >
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gradient-to-br from-[#f9e076] to-[#d4af37] text-[var(--color-text-primary)] rounded-full text-xs flex items-center justify-center shadow-[0_2px_8px_rgba(212,175,55,0.5)] sparkle">
                  ✨
                </span>
              )}
              {emotion.name}
            </button>
          );
        })}
      </div>

      {filteredEmotions.length === 0 && !search.trim() && (
        <p className="text-center text-[var(--color-text-secondary)] mt-4">
          No emotions in this category
        </p>
      )}

      {filteredEmotions.length === 0 && search.trim() && (
        <p className="text-center text-[var(--color-text-secondary)] mt-4">
          No emotions match "{search}" — click Add to use it anyway
        </p>
      )}

      {/* Action buttons - side by side */}
      <div className="mt-6 flex gap-3">
        {/* Help me now - glassmorphic with gold shimmer */}
        {onHelpMeNow && (
          <button
            onClick={onHelpMeNow}
            className="flex-1 py-3.5 px-4 rounded-2xl font-semibold transition-all 
              bg-white/70 backdrop-blur-sm
              border-2 border-[#d4af37]
              text-[var(--color-text-primary)]
              shadow-[0_0_20px_rgba(212,175,55,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]
              hover:shadow-[0_0_28px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.9)]
              hover:bg-white/80
              flex items-center justify-center gap-2"
          >
            <span>💫</span> Help me now
          </button>
        )}
        
        {/* Add more detail - continue to next step */}
        <button
          onClick={handleContinue}
          disabled={selectedEmotions.length === 0}
          className={`
            flex-1 py-3.5 px-4 rounded-2xl font-semibold transition-all
            ${selectedEmotions.length > 0 
              ? 'bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(155,89,182,0.4)]' 
              : 'bg-[var(--color-sage-200)] text-[var(--color-sage-400)] cursor-not-allowed'}
          `}
        >
          Add more detail
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
