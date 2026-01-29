import { useState, useMemo } from 'react';
import { getEmotionsByQuadrant, quadrantColors } from '../../data/emotions';

interface EmotionGridProps {
  quadrant: string;
  onSelect: (emotion: string) => void;
}

export function EmotionGrid({ quadrant, onSelect }: EmotionGridProps) {
  const [search, setSearch] = useState('');
  const emotions = useMemo(() => getEmotionsByQuadrant(quadrant), [quadrant]);
  const colors = quadrantColors[quadrant];

  const filteredEmotions = useMemo(() => {
    if (!search.trim()) return emotions;
    const query = search.toLowerCase();
    return emotions.filter(e => e.name.toLowerCase().includes(query));
  }, [emotions, search]);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        What emotion fits best?
      </h2>
      <p className="text-sm text-[var(--color-sage-600)] text-center mb-4">
        Tap the emotion that best describes how you feel
      </p>

      {/* Search input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search emotions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-sage-300)] bg-white text-[var(--color-sage-800)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-400)]"
        />
      </div>

      {/* Emotion grid */}
      <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredEmotions.map((emotion) => (
          <button
            key={emotion.id}
            onClick={() => onSelect(emotion.name)}
            className={`
              ${colors.bg} ${colors.text}
              py-3 px-2 rounded-full
              text-sm font-medium
              hover:opacity-90 active:scale-95
              transition-all duration-150
              shadow-md hover:shadow-lg
            `}
          >
            {emotion.name}
          </button>
        ))}
      </div>

      {filteredEmotions.length === 0 && (
        <p className="text-center text-[var(--color-sage-500)] mt-4">
          No emotions match "{search}"
        </p>
      )}
    </div>
  );
}
