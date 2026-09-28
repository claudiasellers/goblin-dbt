import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  getEmotionByName,
  getEmotionById,
  getRelatedEmotionIds,
  getOppositeEmotionIds,
} from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';
import { QuadrantCell } from './QuadrantCell';

interface QuadrantGridProps {
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
  onSomaticEntry?: () => void;
  /** "I can't tell what I'm feeling": opens Find the feeling (by shape or by ear). */
  onCantTell?: () => void;
}

const quadrantOrder = [
  'high-unpleasant',
  'high-pleasant',
  'low-unpleasant',
  'low-pleasant',
] as const;

const quadrantAbbr: Record<string, string> = {
  'high-unpleasant': 'hu',
  'high-pleasant': 'hp',
  'low-unpleasant': 'lu',
  'low-pleasant': 'lp',
};

function formatEmotionName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function rankRelatedEmotions(
  candidates: RelatedEmotion[],
  selectedEmotions: string[]
): RelatedEmotion[] {
  const seen = new Set<string>();
  const deduped: RelatedEmotion[] = [];
  for (const c of candidates) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      deduped.push(c);
    }
  }

  const selectedLower = new Set(selectedEmotions.map((s) => s.toLowerCase()));
  const filtered = deduped.filter((c) => {
    const name = formatEmotionName(c.name);
    return !selectedLower.has(name.toLowerCase());
  });

  const qCounts: Record<string, number> = {};
  let total = 0;
  for (const name of selectedEmotions) {
    const e = getEmotionByName(name);
    if (e) {
      qCounts[e.quadrant] = (qCounts[e.quadrant] || 0) + 1;
      total++;
    }
  }

  const scored = filtered.map((c, i) => {
    const emotion =
      getEmotionByName(formatEmotionName(c.name)) || getEmotionById(c.id);
    const quadrant = emotion?.quadrant;
    const neuralScore = Math.max(0, 1 - i * 0.15);
    const quadrantBoost =
      quadrant && total > 0 ? (qCounts[quadrant] || 0) / total : 0;
    return { ...c, combinedScore: neuralScore + quadrantBoost };
  });

  scored.sort(
    (a, b) =>
      (b as typeof b & { combinedScore: number }).combinedScore -
      (a as typeof a & { combinedScore: number }).combinedScore
  );
  return scored.slice(0, 3);
}

export function QuadrantGrid({
  onSelect,
  onHelpMeNow,
  onSomaticEntry,
  onCantTell,
}: QuadrantGridProps) {
  const [levels, setLevels] = useState<Record<string, 0 | 1 | 2>>({
    'high-unpleasant': 0,
    'high-pleasant': 0,
    'low-unpleasant': 0,
    'low-pleasant': 0,
  });

  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);

  // Toggle an emotion selection
  const handleToggleEmotion = useCallback((name: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  }, []);

  // Add a related emotion to selection
  const handleAddRelated = useCallback((emotion: RelatedEmotion) => {
    const name = formatEmotionName(emotion.name);
    setSelectedEmotions((prev) =>
      prev.includes(name) ? prev : [...prev, name]
    );
  }, []);

  // Change level for a specific quadrant
  const handleLevelChange = useCallback(
    (quadrantId: string, level: 0 | 1 | 2) => {
      setLevels((prev) => ({ ...prev, [quadrantId]: level }));
    },
    []
  );

  // Show all / hide all toggle
  const allExpanded = useMemo(
    () => Object.values(levels).every((l) => l >= 1),
    [levels]
  );

  const handleToggleAll = useCallback(() => {
    if (allExpanded) {
      setLevels({
        'high-unpleasant': 0,
        'high-pleasant': 0,
        'low-unpleasant': 0,
        'low-pleasant': 0,
      });
    } else {
      setLevels((prev) => {
        const next = { ...prev };
        for (const q of quadrantOrder) {
          if (next[q] < 1) next[q] = 1;
        }
        return next;
      });
    }
  }, [allExpanded]);

  // Fetch related emotions when selection changes
  useEffect(() => {
    if (selectedEmotions.length === 0) {
      setRelatedEmotions([]);
      return;
    }

    const firstEmotion = selectedEmotions[0];
    const selectedEmotion = getEmotionByName(firstEmotion);
    const emotionId =
      selectedEmotion?.id ?? firstEmotion.toLowerCase().replace(/\s+/g, '_');

    const localRelated = getRelatedEmotionIds(emotionId).map((id) => {
      const e = getEmotionById(id);
      return {
        id,
        name: e?.name ?? id.replace(/_/g, ' '),
        reason: 'related feeling',
      };
    });
    const localOpposites = getOppositeEmotionIds(emotionId).map((id) => {
      const e = getEmotionById(id);
      return {
        id,
        name: e?.name ?? id.replace(/_/g, ' '),
        reason: 'opposite emotion',
      };
    });

    getRelatedEmotions(emotionId)
      .then((graphResults) => {
        const merged = [...localRelated, ...localOpposites, ...graphResults];
        setRelatedEmotions(rankRelatedEmotions(merged, selectedEmotions));
      })
      .catch(() => {
        setRelatedEmotions(
          rankRelatedEmotions(
            [...localRelated, ...localOpposites],
            selectedEmotions
          )
        );
      });
  }, [selectedEmotions]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <h2 className="text-center text-base font-semibold text-[var(--color-text-primary)]">
        How are you feeling?
      </h2>

      {/* Selected emotions bar */}
      {selectedEmotions.length > 0 && (
        <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)]">
          <p className="text-[11px] text-[var(--color-text-secondary)] mb-1.5">
            Selected:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selectedEmotions.map((name) => {
              const emotion = getEmotionByName(name);
              const abbr = emotion
                ? quadrantAbbr[emotion.quadrant] || 'hu'
                : 'hu';
              return (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[11px] text-[var(--color-text-primary)]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-q-${abbr}-fill) 30%, transparent)`,
                    borderWidth: '1px',
                    borderColor: `color-mix(in srgb, var(--color-q-${abbr}-fill) 50%, transparent)`,
                  }}
                >
                  {name}
                  <button
                    className="opacity-50 hover:opacity-100 text-[13px] leading-none bg-transparent border-none cursor-pointer text-inherit"
                    onClick={() => handleToggleEmotion(name)}
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Related emotions panel */}
      {selectedEmotions.length > 0 && relatedEmotions.length > 0 && (
        <div className="p-2.5 rounded-xl bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)]">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
            People who feel{' '}
            <strong className="text-[var(--color-text-primary)]">
              {selectedEmotions[0].toLowerCase()}
            </strong>{' '}
            also describe:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {relatedEmotions.map((related) => {
              const emotion =
                getEmotionByName(formatEmotionName(related.name)) ||
                getEmotionById(related.id);
              const abbr = emotion
                ? quadrantAbbr[emotion.quadrant] || 'hu'
                : 'hu';
              return (
                <button
                  key={related.id}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer transition-all duration-150 hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]"
                  onClick={() => handleAddRelated(related)}
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: `var(--color-q-${abbr}-fill)`,
                    }}
                  />
                  <span>{formatEmotionName(related.name)}</span>
                  <span className="text-[var(--color-text-muted)] text-[13px]">
                    +
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1.5">
            Tap to add · {relatedEmotions[0]?.reason}
          </p>
        </div>
      )}

      {/* Show all / Hide all toggle */}
      <button
        className="w-full py-2.5 rounded-xl text-[13px] cursor-pointer transition-all duration-200 border bg-[var(--color-accent-fill)]/10 border-[var(--color-accent)]/25 text-[var(--color-accent)]"
        onClick={handleToggleAll}
      >
        {allExpanded ? 'Hide all emotions' : 'Show all emotions'}
      </button>

      {/* 2×2 Quadrant Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {quadrantOrder.map((quadrantId) => (
          <QuadrantCell
            key={quadrantId}
            quadrantId={quadrantId}
            level={levels[quadrantId]}
            selectedEmotions={selectedEmotions}
            onToggleEmotion={handleToggleEmotion}
            onLevelChange={(level) => handleLevelChange(quadrantId, level)}
          />
        ))}
      </div>

      {/* Continue button */}
      {selectedEmotions.length > 0 && (
        <button
          className="w-full py-3 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 bg-[var(--color-accent-fill)] text-white border-none lift-primary"
          onClick={() => onSelect(selectedEmotions)}
        >
          Continue with {selectedEmotions.length} emotion
          {selectedEmotions.length !== 1 ? 's' : ''}
        </button>
      )}

      {/* Secondary links */}
      <div className="flex flex-col items-center gap-2 mt-1">
        {onCantTell && (
          <button
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] underline underline-offset-4 bg-transparent border-none cursor-pointer transition-colors"
            onClick={onCantTell}
          >
            I can't tell what I'm feeling
          </button>
        )}
        {onSomaticEntry && (
          <button
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer transition-colors"
            onClick={onSomaticEntry}
          >
            I don't know — start with my body
          </button>
        )}
        {onHelpMeNow && (
          <button
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer transition-colors"
            onClick={onHelpMeNow}
          >
            Help me now
          </button>
        )}
      </div>
    </div>
  );
}
