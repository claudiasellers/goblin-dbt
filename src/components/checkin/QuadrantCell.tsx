import { useMemo } from 'react';
import {
  getEmotionsByQuadrant,
  getCoreEmotionsByQuadrant,
  type Emotion,
} from '../../data/emotions';

interface QuadrantCellProps {
  quadrantId: string;
  level: 0 | 1 | 2;
  selectedEmotions: string[];
  onToggleEmotion: (name: string) => void;
  onLevelChange: (level: 0 | 1 | 2) => void;
}

const quadrantAbbr: Record<string, string> = {
  'high-unpleasant': 'hu',
  'high-pleasant': 'hp',
  'low-unpleasant': 'lu',
  'low-pleasant': 'lp',
};

const quadrantLabels: Record<string, string> = {
  'high-unpleasant': 'High Energy\nUnpleasant',
  'high-pleasant': 'High Energy\nPleasant',
  'low-unpleasant': 'Low Energy\nUnpleasant',
  'low-pleasant': 'Low Energy\nPleasant',
};

export function QuadrantCell({
  quadrantId,
  level,
  selectedEmotions,
  onToggleEmotion,
  onLevelChange,
}: QuadrantCellProps) {
  const abbr = quadrantAbbr[quadrantId] || 'hu';

  const coreEmotions = useMemo(
    () => getCoreEmotionsByQuadrant(quadrantId),
    [quadrantId]
  );

  const allEmotions = useMemo(
    () => getEmotionsByQuadrant(quadrantId),
    [quadrantId]
  );

  const emotions: Emotion[] = level === 2 ? allEmotions : coreEmotions;

  const selectedSet = useMemo(
    () => new Set(selectedEmotions),
    [selectedEmotions]
  );

  // Level 0: label only
  if (level === 0) {
    return (
      <div
        className="rounded-2xl p-3 flex items-center justify-center min-h-[140px] cursor-pointer transition-all duration-300"
        style={{
          backgroundColor: `var(--color-q-${abbr}-bg)`,
          borderWidth: '1px',
          borderColor: `var(--color-q-${abbr}-border)`,
        }}
        onClick={() => onLevelChange(1)}
      >
        <span
          className="text-sm font-semibold text-center whitespace-pre-line leading-snug"
          style={{ color: `var(--color-q-${abbr}-text)` }}
        >
          {quadrantLabels[quadrantId]}
        </span>
      </div>
    );
  }

  // Level 1 & 2: emotion circles
  return (
    <div
      className="rounded-2xl p-3 transition-all duration-300"
      style={{
        backgroundColor: `var(--color-q-${abbr}-bg)`,
        borderWidth: '1px',
        borderColor: `var(--color-q-${abbr}-border)`,
      }}
    >
      {/* Emotion circles */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {emotions.map((emotion, index) => {
          const isSelected = selectedSet.has(emotion.name);
          return (
            <button
              key={emotion.id}
              className="w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-[1.08] hover:brightness-110 active:scale-95"
              style={{
                backgroundColor: `color-mix(in srgb, var(--color-q-${abbr}-fill) 25%, transparent)`,
                borderWidth: '1px',
                borderColor: `color-mix(in srgb, var(--color-q-${abbr}-fill) 40%, transparent)`,
                fontSize: '8.5px',
                lineHeight: '1.15',
                textAlign: 'center',
                padding: '3px',
                color: `var(--color-text-primary)`,
                animation: `popIn 0.2s ease-out backwards`,
                animationDelay: `${index * 20}ms`,
                ...(isSelected
                  ? {
                      boxShadow: '0 0 0 2.5px #fff, 0 0 14px rgba(255,255,255,0.25)',
                      transform: 'scale(1.05)',
                    }
                  : {}),
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleEmotion(emotion.name);
              }}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${emotion.name}`}
            >
              {emotion.name}
            </button>
          );
        })}
      </div>

      {/* Action buttons: hide (left), more/less (right) */}
      <div className="flex justify-center gap-3 mt-2">
        <button
          className="text-[11px] px-2.5 py-1 rounded-lg transition-all duration-150 hover:bg-white/[0.08] border-none bg-transparent cursor-pointer"
          style={{ color: `var(--color-q-${abbr}-text)`, opacity: 0.35 }}
          onClick={(e) => {
            e.stopPropagation();
            onLevelChange(0);
          }}
        >
          hide
        </button>
        <button
          className="text-[11px] px-2.5 py-1 rounded-lg transition-all duration-150 hover:bg-white/[0.08] border-none bg-transparent cursor-pointer"
          style={{ color: `var(--color-q-${abbr}-text)`, opacity: 0.6 }}
          onClick={(e) => {
            e.stopPropagation();
            onLevelChange(level === 2 ? 1 : 2);
          }}
        >
          {level === 2 ? 'less −' : 'more +'}
        </button>
      </div>
    </div>
  );
}
