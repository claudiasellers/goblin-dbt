import { useState, useMemo, useEffect, useRef } from 'react';
import {
  emotions as allEmotions,
  getEmotionByName,
  getEmotionById,
  getEmotionsByQuadrant,
  getCoreEmotionsByQuadrant,
  getRelatedEmotionIds,
  getOppositeEmotionIds,
  type Emotion,
} from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface EmotionPlaneProps {
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
  onSomaticEntry?: () => void;
}

const quadrantOrder = ['high-unpleasant', 'high-pleasant', 'low-unpleasant', 'low-pleasant'] as const;

const quadrantLabels: Record<string, string> = {
  'high-unpleasant': 'High Energy Unpleasant',
  'high-pleasant': 'High Energy Pleasant',
  'low-unpleasant': 'Low Energy Unpleasant',
  'low-pleasant': 'Low Energy Pleasant',
};

const quadrantShortLabels: Record<string, string> = {
  'high-unpleasant': 'High Unpleasant',
  'high-pleasant': 'High Pleasant',
  'low-unpleasant': 'Low Unpleasant',
  'low-pleasant': 'Low Pleasant',
};

// CSS variable mappings per quadrant
const quadrantColors: Record<string, { fill: string; text: string }> = {
  'high-unpleasant': { fill: 'var(--color-q-hu-fill)', text: 'var(--color-q-hu-text)' },
  'high-pleasant': { fill: 'var(--color-q-hp-fill)', text: 'var(--color-q-hp-text)' },
  'low-unpleasant': { fill: 'var(--color-q-lu-fill)', text: 'var(--color-q-lu-text)' },
  'low-pleasant': { fill: 'var(--color-q-lp-fill)', text: 'var(--color-q-lp-text)' },
};

const quadrantChipStyles: Record<string, { bg: string; text: string }> = {
  'high-unpleasant': { bg: 'bg-[var(--color-q-hu-fill)]', text: 'text-white' },
  'high-pleasant': { bg: 'bg-[var(--color-q-hp-fill)]', text: 'text-white' },
  'low-unpleasant': { bg: 'bg-[var(--color-q-lu-fill)]', text: 'text-white' },
  'low-pleasant': { bg: 'bg-[var(--color-q-lp-fill)]', text: 'text-white' },
};

const neutralChipStyle = {
  bg: 'bg-[var(--color-bg-elevated)]',
  text: 'text-[var(--color-text-secondary)]',
};


function formatEmotionName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function rankRelatedEmotions(
  candidates: RelatedEmotion[],
  selectedEmotions: string[],
): RelatedEmotion[] {
  const seen = new Set<string>();
  const deduped: RelatedEmotion[] = [];
  for (const c of candidates) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      deduped.push(c);
    }
  }

  const selectedLower = new Set(selectedEmotions.map(s => s.toLowerCase()));
  const filtered = deduped.filter(c => {
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
    const emotion = getEmotionByName(formatEmotionName(c.name)) || getEmotionById(c.id);
    const quadrant = emotion?.quadrant;
    const neuralScore = Math.max(0, 1 - i * 0.15);
    const quadrantBoost = quadrant && total > 0 ? (qCounts[quadrant] || 0) / total : 0;
    return { ...c, combinedScore: neuralScore + quadrantBoost };
  });

  scored.sort((a, b) => b.combinedScore - a.combinedScore);
  return scored.slice(0, 3);
}

/**
 * Arrange N items in an evenly-spaced grid within a bounding box.
 * Returns array of {left, top} as percentages (0-100).
 * Items are sorted by their y (energy) then x before placement,
 * so spatial meaning is preserved in the grid ordering.
 */
function gridLayout(
  emotions: Emotion[],
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
): { emotion: Emotion; left: number; top: number }[] {
  const n = emotions.length;
  if (n === 0) return [];

  // Sort: high energy first (descending y), then left-to-right (ascending x)
  const sorted = [...emotions].sort((a, b) => {
    const yDiff = (b.y ?? 0.5) - (a.y ?? 0.5);
    if (Math.abs(yDiff) > 0.05) return yDiff;
    return (a.x ?? 0.5) - (b.x ?? 0.5);
  });

  // Compute grid dimensions
  const width = bounds.xMax - bounds.xMin;
  const height = bounds.yMax - bounds.yMin;
  const aspect = width / height;
  const cols = Math.ceil(Math.sqrt(n * aspect));
  const rows = Math.ceil(n / cols);

  // Padding from edges (as fraction of bounds)
  const padX = width * 0.08;
  const padY = height * 0.08;
  const innerW = width - 2 * padX;
  const innerH = height - 2 * padY;

  return sorted.map((emotion, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const colsInRow = row < rows - 1 ? cols : n - row * cols; // last row may have fewer
    const colOffset = (cols - colsInRow) / 2; // center the last row

    const x = bounds.xMin + padX + ((col + colOffset + 0.5) / cols) * innerW;
    const y = bounds.yMin + padY + ((row + 0.5) / rows) * innerH;

    return {
      emotion,
      left: x * 100,
      top: y * 100,
    };
  });
}

export function EmotionPlane({ onSelect, onHelpMeNow, onSomaticEntry }: EmotionPlaneProps) {
  const [zoomedQuadrant, setZoomedQuadrant] = useState<string | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);
  const planeRef = useRef<HTMLDivElement>(null);

  // Precompute
  const coreByQuadrant = useMemo(() => {
    const map: Record<string, Emotion[]> = {};
    for (const q of quadrantOrder) {
      map[q] = getCoreEmotionsByQuadrant(q);
    }
    return map;
  }, []);

  const allByQuadrant = useMemo(() => {
    const map: Record<string, Emotion[]> = {};
    for (const q of quadrantOrder) {
      map[q] = getEmotionsByQuadrant(q);
    }
    return map;
  }, []);

  // Fetch related emotions
  useEffect(() => {
    if (selectedEmotions.length === 0) {
      setRelatedEmotions([]);
      return;
    }

    const firstEmotion = selectedEmotions[0];
    const selectedEmotion = getEmotionByName(firstEmotion);
    const emotionId = selectedEmotion?.id ?? firstEmotion.toLowerCase().replace(/\s+/g, '_');

    const localRelated = getRelatedEmotionIds(emotionId).map(id => {
      const e = getEmotionById(id);
      return { id, name: e?.name ?? id.replace(/_/g, ' '), reason: 'related feeling' };
    });
    const localOpposites = getOppositeEmotionIds(emotionId).map(id => {
      const e = getEmotionById(id);
      return { id, name: e?.name ?? id.replace(/_/g, ' '), reason: 'opposite emotion' };
    });

    getRelatedEmotions(emotionId)
      .then(graphResults => {
        const merged = [...localRelated, ...localOpposites, ...graphResults];
        setRelatedEmotions(rankRelatedEmotions(merged, selectedEmotions));
      })
      .catch(() => {
        setRelatedEmotions(
          rankRelatedEmotions([...localRelated, ...localOpposites], selectedEmotions)
        );
      });
  }, [selectedEmotions]);

  // Search
  const searchQuery = search.toLowerCase().trim();

  const allSearchResults = useMemo(() => {
    if (!searchQuery) return [];
    return allEmotions.filter(e => e.name.toLowerCase().includes(searchQuery));
  }, [searchQuery]);

  const searchMatchesExisting = useMemo(() => {
    if (!search.trim()) return true;
    return allEmotions.some(e => e.name.toLowerCase() === search.trim().toLowerCase());
  }, [search]);

  function toggleEmotion(emotionName: string) {
    setSelectedEmotions(prev =>
      prev.includes(emotionName)
        ? prev.filter(e => e !== emotionName)
        : [...prev, emotionName]
    );
  }

  function addRelatedEmotion(emotion: RelatedEmotion) {
    const name = formatEmotionName(emotion.name);
    if (!selectedEmotions.includes(name)) {
      setSelectedEmotions(prev => [...prev, name]);
    }
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

  // Tap on a quadrant region in zoomed-out mode
  function handlePlaneClick(e: React.MouseEvent) {
    if (zoomedQuadrant || !planeRef.current) return;
    const rect = planeRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const isLeft = relX < 0.5;
    const isTop = relY < 0.5;
    if (isTop && isLeft) setZoomedQuadrant('high-unpleasant');
    else if (isTop && !isLeft) setZoomedQuadrant('high-pleasant');
    else if (!isTop && isLeft) setZoomedQuadrant('low-unpleasant');
    else setZoomedQuadrant('low-pleasant');
  }

  function handleZoomOut() {
    setZoomedQuadrant(null);
  }

  const isZoomed = zoomedQuadrant !== null;

  // Quadrant bounding boxes in CSS coordinates (top-left = 0,0)
  const quadrantBounds: Record<string, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
    'high-unpleasant': { xMin: 0.02, xMax: 0.47, yMin: 0.02, yMax: 0.47 },
    'high-pleasant':   { xMin: 0.53, xMax: 0.98, yMin: 0.02, yMax: 0.47 },
    'low-unpleasant':  { xMin: 0.02, xMax: 0.47, yMin: 0.53, yMax: 0.98 },
    'low-pleasant':    { xMin: 0.53, xMax: 0.98, yMin: 0.53, yMax: 0.98 },
  };

  // Compute positioned emotions for the current view
  const positionedEmotions = useMemo(() => {
    if (!isZoomed) {
      // Zoomed out: core emotions in grid layout within each quadrant
      return quadrantOrder.flatMap(q =>
        gridLayout(coreByQuadrant[q] || [], quadrantBounds[q])
      );
    }

    // Zoomed in: all emotions in a grid filling the full container
    const emotions = allByQuadrant[zoomedQuadrant!] || [];
    return gridLayout(emotions, { xMin: 0.02, xMax: 0.98, yMin: 0.04, yMax: 0.96 });
  }, [isZoomed, zoomedQuadrant, coreByQuadrant, allByQuadrant]);

  // Background gradient
  const planeBackground = isZoomed
    ? `radial-gradient(ellipse at 50% 50%, color-mix(in srgb, ${quadrantColors[zoomedQuadrant!].fill} 12%, transparent) 0%, color-mix(in srgb, ${quadrantColors[zoomedQuadrant!].fill} 4%, transparent) 100%), var(--color-bg-card)`
    : `
      radial-gradient(ellipse at 0% 0%, color-mix(in srgb, var(--color-q-hu-fill) 15%, transparent) 0%, transparent 70%),
      radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--color-q-hp-fill) 15%, transparent) 0%, transparent 70%),
      radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--color-q-lu-fill) 15%, transparent) 0%, transparent 70%),
      radial-gradient(ellipse at 100% 100%, color-mix(in srgb, var(--color-q-lp-fill) 15%, transparent) 0%, transparent 70%),
      var(--color-bg-card)
    `;

  // Sizes: smaller in zoomed-out to prevent overlap, bigger in zoomed-in to fill space
  const circleSize = isZoomed ? 64 : 40;
  const fontSize = isZoomed ? 10 : 8;

  // Compute required container height for zoomed-in view based on grid rows
  const zoomedContainerHeight = useMemo(() => {
    if (!isZoomed) return undefined;
    const n = (allByQuadrant[zoomedQuadrant!] || []).length;
    const aspect = 1; // roughly square container
    const cols = Math.ceil(Math.sqrt(n * aspect));
    const rows = Math.ceil(n / cols);
    const cellHeight = circleSize + 14; // circle + gap
    return rows * cellHeight + 40; // + padding
  }, [isZoomed, zoomedQuadrant, allByQuadrant, circleSize]);

  return (
    <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-1">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-3">
        {isZoomed
          ? `${quadrantLabels[zoomedQuadrant!]} — tap to select`
          : 'Tap a region to explore'
        }
      </p>

      {/* Search input */}
      <div className="mb-2" style={{ flexShrink: 0 }}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search or type your own..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-3 pr-20 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
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
            Press Enter to add &ldquo;{search.trim()}&rdquo;
          </p>
        )}
      </div>

      {/* Selected emotion chips */}
      {selectedEmotions.length > 0 && (
        <div
          className="flex gap-2 mb-2 px-1 overflow-x-auto scrollbar-hide pb-1"
          style={{ flexShrink: 0 }}
        >
          {selectedEmotions.map((name) => {
            const emotion = getEmotionByName(name);
            const chipStyle = emotion
              ? quadrantChipStyles[emotion.quadrant] || neutralChipStyle
              : neutralChipStyle;
            return (
              <span
                key={name}
                className={`${chipStyle.bg} ${chipStyle.text} py-1.5 px-3.5 rounded-full text-sm font-medium flex items-center gap-1.5 whitespace-nowrap`}
              >
                {name}
                <button
                  onClick={() => toggleEmotion(name)}
                  className="ml-0.5 hover:opacity-70 text-lg leading-none"
                  aria-label={`Remove ${name}`}
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Related emotion suggestions */}
      {selectedEmotions.length > 0 && relatedEmotions.length > 0 && (
        <div
          className="mb-2 p-2.5 rounded-xl bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)]"
          style={{ flexShrink: 0 }}
        >
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            People who feel <strong>{selectedEmotions[0].toLowerCase()}</strong> also describe:
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedEmotions.map((related) => {
              const emotion = getEmotionByName(formatEmotionName(related.name)) || getEmotionById(related.id);
              const dotColor = emotion ? quadrantColors[emotion.quadrant]?.fill : undefined;
              return (
                <button
                  key={related.id}
                  onClick={() => addRelatedEmotion(related)}
                  className="group flex items-center gap-1.5 py-1.5 px-3 rounded-full text-sm
                    bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)]
                    lift-secondary"
                >
                  {dotColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor }}
                    />
                  )}
                  <span>{formatEmotionName(related.name)}</span>
                  <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]">
                    +
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1.5">
            Tap to add &middot; {relatedEmotions[0]?.reason}
          </p>
        </div>
      )}

      {/* Search results (shown instead of plane when searching) */}
      {searchQuery ? (
        <div className="flex-1 overflow-y-auto min-h-0 pb-2 px-1">
          {allSearchResults.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allSearchResults.map(emotion => {
                const isSelected = selectedEmotions.includes(emotion.name);
                const qc = quadrantColors[emotion.quadrant];
                return (
                  <button
                    key={emotion.id}
                    type="button"
                    onClick={() => toggleEmotion(emotion.name)}
                    style={{
                      backgroundColor: isSelected
                        ? qc.fill
                        : `color-mix(in srgb, ${qc.fill} 25%, transparent)`,
                      color: isSelected ? 'white' : qc.text,
                    }}
                    className={`
                      py-1.5 px-3.5 rounded-full text-xs font-semibold cursor-pointer select-none
                      transition-all duration-150
                      ${isSelected ? 'ring-2 ring-white/30 shadow-md' : 'hover:brightness-110'}
                    `}
                  >
                    {emotion.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[var(--color-text-tertiary)] mt-4 text-sm">
              No matches — click Add to use &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      ) : (
        /* ========== THE 2D EMOTION PLANE ========== */
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Zoom-out button */}
          {isZoomed && (
            <button
              onClick={handleZoomOut}
              className="self-start mb-2 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <span>←</span>
              <span>All emotions</span>
            </button>
          )}

          {/* The plane container */}
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: isZoomed ? undefined : '1',
              maxHeight: isZoomed ? undefined : '420px',
              height: isZoomed ? `${zoomedContainerHeight}px` : undefined,
              flexShrink: isZoomed ? 0 : 1,
              background: planeBackground,
              cursor: isZoomed ? 'default' : 'pointer',
            }}
            ref={planeRef}
            onClick={!isZoomed ? handlePlaneClick : undefined}
          >
            {/* Axis labels — zoomed-out only */}
            {!isZoomed && (
              <>
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] pointer-events-none select-none z-20">
                  High Energy
                </span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] pointer-events-none select-none z-20">
                  Low Energy
                </span>
                <span className="absolute left-2 top-1/2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] pointer-events-none select-none z-20"
                  style={{ writingMode: 'vertical-lr', transform: 'translateY(-50%) rotate(180deg)' }}
                >
                  Unpleasant
                </span>
                <span className="absolute right-2 top-1/2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] pointer-events-none select-none z-20"
                  style={{ writingMode: 'vertical-lr', transform: 'translateY(-50%)' }}
                >
                  Pleasant
                </span>

                {/* Subtle crosshairs */}
                <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--color-border)] opacity-15 pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[var(--color-border)] opacity-15 pointer-events-none" />
              </>
            )}

            {/* Quadrant label overlay when zoomed */}
            {isZoomed && (
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-20">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: quadrantColors[zoomedQuadrant!].fill }}
                />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: quadrantColors[zoomedQuadrant!].text, opacity: 0.7 }}
                >
                  {quadrantLabels[zoomedQuadrant!]}
                </span>
              </div>
            )}

            {/* Emotion circles */}
            {positionedEmotions.map(({ emotion, left, top }) => {
              const qc = quadrantColors[emotion.quadrant];
              const isSelected = selectedEmotions.includes(emotion.name);

              return (
                <button
                  key={emotion.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isZoomed) {
                      toggleEmotion(emotion.name);
                    } else {
                      toggleEmotion(emotion.name);
                      setZoomedQuadrant(emotion.quadrant);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: 'translate(-50%, -50%)',
                    width: circleSize,
                    height: circleSize,
                    fontSize,
                    backgroundColor: isSelected
                      ? qc.fill
                      : `color-mix(in srgb, ${qc.fill} 28%, transparent)`,
                    color: isSelected ? 'white' : qc.text,
                    boxShadow: isSelected
                      ? `0 2px 8px color-mix(in srgb, ${qc.fill} 50%, transparent)`
                      : 'none',
                    zIndex: isSelected ? 10 : 1,
                  }}
                  className={`
                    rounded-full flex items-center justify-center
                    font-semibold text-center leading-tight
                    transition-all duration-200 select-none
                    ${isSelected ? 'ring-2 ring-white/40 scale-110' : 'hover:scale-105 active:scale-95'}
                    cursor-pointer
                  `}
                >
                  <span className="px-0.5" style={{ lineHeight: '1.1' }}>{emotion.name}</span>
                </button>
              );
            })}
          </div>

          {/* Quadrant quick-switch tabs when zoomed */}
          {isZoomed && (
            <div className="flex gap-1.5 mt-2 justify-center">
              {quadrantOrder.map(q => (
                <button
                  key={q}
                  onClick={() => setZoomedQuadrant(q)}
                  className={`
                    flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium
                    transition-all duration-200
                    ${q === zoomedQuadrant
                      ? 'bg-[var(--color-bg-card)] shadow-sm border border-[var(--color-border)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                    }
                  `}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: quadrantColors[q].fill }}
                  />
                  {q === zoomedQuadrant && (
                    <span className="text-[var(--color-text-secondary)]">
                      {quadrantShortLabels[q]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Somatic entry link */}
      {onSomaticEntry && (
        <button
          onClick={onSomaticEntry}
          className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors py-2 text-center"
          style={{ flexShrink: 0 }}
        >
          I don't know — start with my body
        </button>
      )}

      {/* Action buttons — sticky bottom */}
      <div className="mt-1 flex gap-3" style={{ flexShrink: 0 }}>
        {onHelpMeNow && (
          <button
            onClick={onHelpMeNow}
            className="flex-1 py-3 px-4 rounded-xl border border-dashed border-[var(--color-border-accent)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Help me now
          </button>
        )}
        <button
          onClick={handleContinue}
          className={`
            flex-1 py-3 px-4 rounded-xl font-medium
            ${selectedEmotions.length > 0
              ? 'bg-[var(--color-accent)] text-white lift-primary'
              : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] transition-colors'}
          `}
        >
          {selectedEmotions.length > 0
            ? `Continue with ${selectedEmotions.length}`
            : 'Continue'}
        </button>
      </div>
    </div>
  );
}
