import { useState, useMemo, useEffect, useRef } from 'react';
import {
  emotions as allEmotions,
  getEmotionByName,
  getEmotionById,
  getEmotionsByQuadrant,
  getRelatedEmotionIds,
  getOppositeEmotionIds,
  getCoreEmotions,
  GRID_ROWS,
  GRID_COLS,
  type CoreEmotion,
  type Emotion,
} from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';
import { bilinearInterpolate } from '../../utils/colorInterpolation';

interface EmotionPlaneProps {
  initialQuadrant: string;
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
}

const quadrantChipStyles: Record<string, { bg: string; text: string }> = {
  'high-unpleasant': { bg: 'bg-[var(--color-quadrant-high-unpleasant)]', text: 'text-white' },
  'high-pleasant': { bg: 'bg-[var(--color-quadrant-high-pleasant)]', text: 'text-white' },
  'low-unpleasant': { bg: 'bg-[var(--color-quadrant-low-unpleasant)]', text: 'text-white' },
  'low-pleasant': { bg: 'bg-[var(--color-quadrant-low-pleasant)]', text: 'text-white' },
};

const quadrantLabels: Record<string, string> = {
  'high-unpleasant': 'High Energy Unpleasant',
  'high-pleasant': 'High Energy Pleasant',
  'low-unpleasant': 'Low Energy Unpleasant',
  'low-pleasant': 'Low Energy Pleasant',
};

// Ordered for layout: preserve energy axis (high before low)
const quadrantOrder = ['high-unpleasant', 'high-pleasant', 'low-unpleasant', 'low-pleasant'] as const;

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

function formatEmotionName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function EmotionPlane({ initialQuadrant, onSelect, onHelpMeNow }: EmotionPlaneProps) {
  const [search, setSearch] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);
  const [expandedQuadrant, setExpandedQuadrant] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);

  // Track theme for color re-computation
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute('data-theme') || 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'light');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const corners = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      tl: style.getPropertyValue('--color-quadrant-high-unpleasant').trim() || '#C4707A',
      tr: style.getPropertyValue('--color-quadrant-high-pleasant').trim() || '#C9A55A',
      bl: style.getPropertyValue('--color-quadrant-low-unpleasant').trim() || '#7B8EC4',
      br: style.getPropertyValue('--color-quadrant-low-pleasant').trim() || '#6BA89A',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const coreGrid = useMemo(() => getCoreEmotions(), []);

  // All emotions by quadrant (for zoom mode)
  const allByQuadrant = useMemo(() => {
    const grouped: Record<string, Emotion[]> = {};
    for (const q of quadrantOrder) {
      grouped[q] = getEmotionsByQuadrant(q);
    }
    return grouped;
  }, []);

  // Compute interpolated color for each core grid cell
  const cellColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of coreGrid) {
      const color = bilinearInterpolate(
        item.gridPosition.row, item.gridPosition.col,
        GRID_ROWS, GRID_COLS,
        corners,
      );
      map.set(item.id, color);
    }
    return map;
  }, [coreGrid, corners]);

  // Auto-scroll to initial quadrant on mount
  useEffect(() => {
    if (!scrollRef.current || !gridRef.current) return;
    requestAnimationFrame(() => {
      const isTop = initialQuadrant.startsWith('high');
      if (gridRef.current) {
        gridRef.current.scrollIntoView({
          behavior: 'smooth',
          block: isTop ? 'start' : 'end',
        });
      }
    });
  }, [initialQuadrant]);

  // Scroll expanded zone into view when zooming
  useEffect(() => {
    if (expandedQuadrant && expandedRef.current) {
      requestAnimationFrame(() => {
        expandedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [expandedQuadrant]);

  // Fetch and rank related emotions
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

  // Search filtering
  const searchQuery = search.toLowerCase().trim();

  const filteredCoreIds = useMemo(() => {
    if (!searchQuery) return null; // null = no filter active
    return new Set(
      coreGrid.filter(e => e.name.toLowerCase().includes(searchQuery)).map(e => e.id)
    );
  }, [coreGrid, searchQuery]);

  // Search results from ALL emotions (for search mode)
  const allSearchResults = useMemo(() => {
    if (!searchQuery) return [];
    return allEmotions.filter(e => e.name.toLowerCase().includes(searchQuery));
  }, [searchQuery]);

  const searchMatchesExisting = useMemo(() => {
    if (!search.trim()) return true;
    return allEmotions.some(e => e.name.toLowerCase() === search.trim().toLowerCase());
  }, [search]);

  // Count selected per quadrant (for badges)
  const selectedCountByQuadrant = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const name of selectedEmotions) {
      const e = getEmotionByName(name);
      if (e) counts[e.quadrant] = (counts[e.quadrant] || 0) + 1;
    }
    return counts;
  }, [selectedEmotions]);

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

  // Get the quadrant color for a given quadrant ID
  function getQuadrantColor(quadrant: string): string {
    const map: Record<string, string> = {
      'high-unpleasant': corners.tl,
      'high-pleasant': corners.tr,
      'low-unpleasant': corners.bl,
      'low-pleasant': corners.br,
    };
    return map[quadrant] || '#888';
  }

  // Render a core grid circle (overview mode)
  function renderCoreCircle(item: CoreEmotion, dimmed: boolean) {
    const color = cellColors.get(item.id) || '#888';
    const isSelected = selectedEmotions.includes(item.name);

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => toggleEmotion(item.name)}
        style={{
          backgroundColor: isSelected ? color : `${color}20`,
          borderColor: isSelected ? 'transparent' : `${color}55`,
          color: isSelected ? 'white' : color,
          opacity: dimmed ? 0.25 : 1,
        }}
        className={`
          aspect-square rounded-full flex items-center justify-center
          text-[10px] sm:text-[11px] font-semibold text-center leading-tight
          border transition-all duration-150 p-0.5
          ${isSelected ? 'scale-105 shadow-md ring-2 ring-white/30' : 'hover:brightness-110'}
          ${dimmed ? 'pointer-events-none' : 'cursor-pointer'}
        `}
      >
        {item.name}
      </button>
    );
  }

  // Render a smaller circle for zoom mode
  function renderZoomCircle(emotion: Emotion, quadrantColor: string) {
    const isSelected = selectedEmotions.includes(emotion.name);
    const dimmed = !!searchQuery && !emotion.name.toLowerCase().includes(searchQuery);

    return (
      <button
        key={emotion.id}
        type="button"
        onClick={() => toggleEmotion(emotion.name)}
        style={{
          backgroundColor: isSelected ? quadrantColor : `${quadrantColor}18`,
          borderColor: isSelected ? 'transparent' : `${quadrantColor}40`,
          color: isSelected ? 'white' : quadrantColor,
          opacity: dimmed ? 0.2 : 1,
        }}
        className={`
          w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
          text-[9px] sm:text-[10px] font-semibold text-center leading-tight
          border transition-all duration-150 p-0.5
          ${isSelected ? 'scale-105 shadow-md ring-2 ring-white/30' : 'hover:brightness-110'}
          ${dimmed ? 'pointer-events-none' : 'cursor-pointer'}
        `}
      >
        {emotion.name}
      </button>
    );
  }

  // Render a collapsed quadrant header (zoom mode)
  function renderCollapsedHeader(quadrant: string) {
    const count = selectedCountByQuadrant[quadrant] || 0;
    const dotColor = getQuadrantColor(quadrant);

    return (
      <button
        key={quadrant}
        onClick={() => setExpandedQuadrant(quadrant)}
        className="
          w-full flex items-center gap-3 px-4 py-3
          text-left transition-colors
          hover:bg-[var(--color-bg-card-hover)]
          border-b border-[var(--color-border-subtle)]
        "
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: dotColor }}
        />
        <span className="text-sm font-medium text-[var(--color-text-secondary)] flex-1">
          {quadrantLabels[quadrant]}
        </span>
        {count > 0 && (
          <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-elevated)] px-2 py-0.5 rounded-full">
            {count} selected
          </span>
        )}
        <span className="text-[var(--color-text-muted)] text-xs">▸</span>
      </button>
    );
  }

  // Render the expanded quadrant zone (zoom mode)
  function renderExpandedZone(quadrant: string) {
    const emotions = allByQuadrant[quadrant] || [];
    const color = getQuadrantColor(quadrant);
    const dotColor = color;

    return (
      <div key={quadrant} ref={expandedRef} className="flex-1 min-h-0 flex flex-col">
        {/* Expanded header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: dotColor }}
          />
          <span className="text-sm font-medium flex-1" style={{ color: dotColor }}>
            {quadrantLabels[quadrant]}
          </span>
          <button
            onClick={() => setExpandedQuadrant(null)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Show less ↑
          </button>
        </div>

        {/* Emotion circles — wrapped flow */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {emotions.map(e => renderZoomCircle(e, color))}
          </div>
        </div>
      </div>
    );
  }

  // Split core grid into quadrant zones for overview "+more" buttons
  const topHalf = coreGrid.filter(e => e.gridPosition.row < 3);
  const bottomHalf = coreGrid.filter(e => e.gridPosition.row >= 3);

  const isOverview = expandedQuadrant === null;

  return (
    <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-1">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-3">
        Tap all that apply — from any quadrant
      </p>

      {/* Selected emotion chips */}
      {selectedEmotions.length > 0 && (
        <div
          className="flex gap-2 mb-3 px-1 overflow-x-auto scrollbar-hide pb-1"
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
                className={`${chipStyle.bg} ${chipStyle.text} py-1 px-3 rounded-full text-sm font-medium flex items-center gap-1 whitespace-nowrap`}
              >
                {name}
                <button
                  onClick={() => toggleEmotion(name)}
                  className="ml-1 hover:opacity-70"
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Related emotion suggestions */}
      {selectedEmotions.length > 0 && relatedEmotions.length > 0 && (
        <div
          className="mb-3 p-2.5 rounded-lg bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)]"
          style={{ flexShrink: 0 }}
        >
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            People who feel <strong>{selectedEmotions[0].toLowerCase()}</strong> also describe:
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedEmotions.map((related) => {
              const emotion = getEmotionByName(formatEmotionName(related.name)) || getEmotionById(related.id);
              const dotColor = emotion ? getQuadrantColor(emotion.quadrant) : undefined;
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
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
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
            Tap to add · {relatedEmotions[0]?.reason}
          </p>
        </div>
      )}

      {/* Search input */}
      <div className="mb-3" style={{ flexShrink: 0 }}>
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
            Press Enter to add &ldquo;{search.trim()}&rdquo;
          </p>
        )}
      </div>

      {/* Scrollable content area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 pb-2 flex flex-col">

        {/* ========== OVERVIEW MODE ========== */}
        {isOverview && (
          <>
            {/* Axis label: High Energy */}
            <div className="text-center mb-1.5">
              <span className="text-[10px] text-[var(--color-text-muted)] tracking-wide uppercase">
                ↑ High Energy
              </span>
            </div>

            {/* 6×6 Structured Grid */}
            <div ref={gridRef} className="relative px-2">
              {/* Vertical center divider */}
              <div
                className="absolute top-0 bottom-0 w-px pointer-events-none z-0"
                style={{
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--color-border-subtle)',
                  opacity: 0.5,
                }}
              />

              {/* Top half — high energy (rows 0–2) */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {topHalf.map(item =>
                  renderCoreCircle(item, !!filteredCoreIds && !filteredCoreIds.has(item.id))
                )}
              </div>

              {/* +more buttons for top quadrants */}
              <div className="grid grid-cols-2 mt-1">
                <button
                  onClick={() => setExpandedQuadrant('high-unpleasant')}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-left pl-1 py-1"
                >
                  + more
                </button>
                <button
                  onClick={() => setExpandedQuadrant('high-pleasant')}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-right pr-1 py-1"
                >
                  + more
                </button>
              </div>

              {/* Horizontal center divider */}
              <div className="flex items-center my-1 sm:my-1.5">
                <div
                  className="flex-1 h-px"
                  style={{ background: 'var(--color-border-subtle)', opacity: 0.5 }}
                />
              </div>

              {/* Bottom half — low energy (rows 3–5) */}
              <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                {bottomHalf.map(item =>
                  renderCoreCircle(item, !!filteredCoreIds && !filteredCoreIds.has(item.id))
                )}
              </div>

              {/* +more buttons for bottom quadrants */}
              <div className="grid grid-cols-2 mt-1">
                <button
                  onClick={() => setExpandedQuadrant('low-unpleasant')}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-left pl-1 py-1"
                >
                  + more
                </button>
                <button
                  onClick={() => setExpandedQuadrant('low-pleasant')}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-right pr-1 py-1"
                >
                  + more
                </button>
              </div>
            </div>

            {/* Axis labels */}
            <div className="text-center mt-1.5 mb-1">
              <span className="text-[10px] text-[var(--color-text-muted)] tracking-wide uppercase">
                ↓ Low Energy
              </span>
            </div>
            <div className="flex justify-between px-4 mb-3">
              <span className="text-[10px] text-[var(--color-text-muted)] tracking-wide uppercase">
                ← Unpleasant
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] tracking-wide uppercase">
                Pleasant →
              </span>
            </div>

            {/* Non-core search results (overview mode) */}
            {searchQuery && allSearchResults.length > 0 && (
              <div className="mt-1 px-2">
                <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                  {filteredCoreIds && filteredCoreIds.size > 0 ? 'More matches:' : 'Matches:'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allSearchResults
                    .filter(e => !filteredCoreIds || !filteredCoreIds.has(e.id))
                    .map(emotion => {
                      const isSelected = selectedEmotions.includes(emotion.name);
                      const color = getQuadrantColor(emotion.quadrant);
                      return (
                        <button
                          key={emotion.id}
                          type="button"
                          onClick={() => toggleEmotion(emotion.name)}
                          style={{
                            backgroundColor: isSelected ? color : `${color}18`,
                            borderColor: isSelected ? 'transparent' : `${color}40`,
                            color: isSelected ? 'white' : color,
                          }}
                          className={`
                            py-1.5 px-3 rounded-full text-xs font-medium cursor-pointer select-none
                            border transition-all duration-150
                            ${isSelected ? 'ring-2 ring-white/30' : 'hover:brightness-110'}
                          `}
                        >
                          {emotion.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {searchQuery && allSearchResults.length === 0 && (
              <p className="text-center text-[var(--color-text-tertiary)] mt-2 text-sm">
                No matches — click Add to use &ldquo;{search}&rdquo;
              </p>
            )}
          </>
        )}

        {/* ========== ZOOM MODE ========== */}
        {!isOverview && (
          <div className="flex flex-col flex-1 min-h-0 rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
            {quadrantOrder.map(q =>
              q === expandedQuadrant
                ? renderExpandedZone(q)
                : renderCollapsedHeader(q)
            )}
          </div>
        )}
      </div>

      {/* Action buttons — sticky bottom */}
      <div className="mt-3 flex gap-3" style={{ flexShrink: 0 }}>
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
          {selectedEmotions.length > 0
            ? `Continue with ${selectedEmotions.length}`
            : 'Continue'}
        </button>
      </div>
    </div>
  );
}

const neutralChipStyle = {
  bg: 'bg-[var(--color-bg-elevated)]',
  text: 'text-[var(--color-text-secondary)]',
};
