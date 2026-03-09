import { useState, useMemo, useEffect } from 'react';
import {
  emotions as allEmotions,
  getEmotionByName,
  getEmotionById,
  getEmotionsByQuadrant,
  getRelatedEmotionIds,
  getOppositeEmotionIds,
  getCoreEmotionsByQuadrant,
  type Emotion,
} from '../../data/emotions';
import { getRelatedEmotions, type RelatedEmotion } from '../../services/neo4j';

interface EmotionPlaneProps {
  initialQuadrant: string;
  onSelect: (emotions: string[]) => void;
  onHelpMeNow?: () => void;
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
const quadrantStyles: Record<string, {
  fill: string; text: string; border: string;
}> = {
  'high-unpleasant': {
    fill: 'var(--color-q-hu-fill)',
    text: 'var(--color-q-hu-text)',
    border: 'var(--color-q-hu-border)',
  },
  'high-pleasant': {
    fill: 'var(--color-q-hp-fill)',
    text: 'var(--color-q-hp-text)',
    border: 'var(--color-q-hp-border)',
  },
  'low-unpleasant': {
    fill: 'var(--color-q-lu-fill)',
    text: 'var(--color-q-lu-text)',
    border: 'var(--color-q-lu-border)',
  },
  'low-pleasant': {
    fill: 'var(--color-q-lp-fill)',
    text: 'var(--color-q-lp-text)',
    border: 'var(--color-q-lp-border)',
  },
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

export function EmotionPlane({ initialQuadrant, onSelect, onHelpMeNow }: EmotionPlaneProps) {
  const [bloomedQuadrant, setBloomedQuadrant] = useState<string | null>(null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [relatedEmotions, setRelatedEmotions] = useState<RelatedEmotion[]>([]);

  // Precompute data
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

  // Scroll initially tapped quadrant into view
  useEffect(() => {
    const el = document.getElementById(`zone-${initialQuadrant}`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [initialQuadrant]);

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

  // Search matches by quadrant (for bloom hint)
  const searchMatchCountByQuadrant = useMemo(() => {
    if (!searchQuery) return {};
    const counts: Record<string, number> = {};
    for (const e of allSearchResults) {
      counts[e.quadrant] = (counts[e.quadrant] || 0) + 1;
    }
    return counts;
  }, [searchQuery, allSearchResults]);

  // Selected per quadrant
  const selectedByQuadrant = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const name of selectedEmotions) {
      const e = getEmotionByName(name);
      if (e) {
        if (!map[e.quadrant]) map[e.quadrant] = [];
        map[e.quadrant].push(name);
      }
    }
    return map;
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

  const isDefault = bloomedQuadrant === null;

  // --- Circle renderer ---
  function renderCircle(emotion: Emotion, size: 'default' | 'bloomed') {
    const qStyles = quadrantStyles[emotion.quadrant];
    const isSelected = selectedEmotions.includes(emotion.name);
    const dimmed = !!searchQuery && !emotion.name.toLowerCase().includes(searchQuery);

    // Default: big bold circles. Bloomed: slightly smaller to fit more.
    const diameter = size === 'default' ? 72 : 56;
    const fontSize = size === 'default' ? 11 : 10;

    return (
      <button
        key={emotion.id}
        type="button"
        onClick={() => toggleEmotion(emotion.name)}
        style={{
          width: diameter,
          height: diameter,
          backgroundColor: isSelected
            ? qStyles.fill
            : `color-mix(in srgb, ${qStyles.fill} 30%, transparent)`,
          color: isSelected ? 'white' : qStyles.text,
          fontSize,
          opacity: dimmed ? 0.15 : 1,
          boxShadow: isSelected
            ? `0 2px 8px color-mix(in srgb, ${qStyles.fill} 40%, transparent)`
            : 'none',
        }}
        className={`
          rounded-full flex items-center justify-center
          font-semibold text-center leading-tight
          transition-all duration-150 select-none flex-shrink-0
          ${isSelected ? 'scale-110 ring-2 ring-white/40' : 'hover:scale-105 active:scale-95'}
          ${dimmed ? 'pointer-events-none' : 'cursor-pointer'}
        `}
      >
        <span className="px-1">{emotion.name}</span>
      </button>
    );
  }

  // --- Header bar for collapsed quadrants in bloom mode ---
  function renderHeaderBar(quadrant: string) {
    const qStyles = quadrantStyles[quadrant];
    const selected = selectedByQuadrant[quadrant] || [];

    let selectionText = '';
    if (selected.length === 1) {
      selectionText = selected[0];
    } else if (selected.length === 2) {
      selectionText = selected.join(', ');
    } else if (selected.length > 2) {
      selectionText = `${selected[0]}, +${selected.length - 1} more`;
    }

    return (
      <button
        key={quadrant}
        onClick={() => setBloomedQuadrant(quadrant)}
        style={{
          background: `color-mix(in srgb, ${qStyles.fill} 15%, var(--color-bg-card))`,
          borderLeft: `3px solid ${qStyles.fill}`,
        }}
        className="
          w-full flex items-center gap-3 px-4 py-3.5
          rounded-lg transition-all duration-200
          hover:brightness-95 active:brightness-90
        "
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: qStyles.fill }}
        />
        <span className="text-sm font-semibold text-[var(--color-text-primary)] flex-1 text-left">
          {quadrantShortLabels[quadrant]}
        </span>
        {selectionText && (
          <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[140px]">
            {selectionText}
          </span>
        )}
        <span className="text-[var(--color-text-muted)] text-sm">&rsaquo;</span>
      </button>
    );
  }

  // --- Default 2x2 zone ---
  function renderZone(quadrant: string) {
    const qStyles = quadrantStyles[quadrant];
    const coreEmotions = coreByQuadrant[quadrant] || [];

    return (
      <div
        key={quadrant}
        id={`zone-${quadrant}`}
        className="rounded-2xl p-3 pb-2 flex flex-col"
        style={{
          background: `color-mix(in srgb, ${qStyles.fill} 8%, var(--color-bg-card))`,
        }}
      >
        {/* Zone header — minimal */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: qStyles.fill }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: qStyles.text, opacity: 0.7 }}
          >
            {quadrantShortLabels[quadrant]}
          </span>
        </div>

        {/* Emotion circles in a grid — 4 columns on mobile, adapts */}
        <div
          className="grid gap-2 justify-items-center"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))' }}
        >
          {coreEmotions.map(e => renderCircle(e, 'default'))}
        </div>

        {/* Explore affordance */}
        <button
          onClick={() => setBloomedQuadrant(quadrant)}
          className="text-[11px] mt-2 py-1 self-center transition-colors"
          style={{ color: qStyles.text, opacity: 0.5 }}
          onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.8'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.5'; }}
        >
          explore all &rarr;
        </button>
      </div>
    );
  }

  // --- Bloomed expanded zone ---
  function renderExpandedZone(quadrant: string) {
    const qStyles = quadrantStyles[quadrant];
    const emotionsList = allByQuadrant[quadrant] || [];

    // Search hint for other quadrants
    const otherQuadrantHints = searchQuery
      ? quadrantOrder
          .filter(q => q !== quadrant && (searchMatchCountByQuadrant[q] || 0) > 0)
          .map(q => ({ quadrant: q, count: searchMatchCountByQuadrant[q] }))
      : [];

    return (
      <div
        key={quadrant}
        className="rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden"
        style={{
          background: `color-mix(in srgb, ${qStyles.fill} 6%, var(--color-bg-card))`,
          borderLeft: `3px solid ${qStyles.fill}`,
        }}
      >
        {/* Expanded header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: qStyles.fill }}
          />
          <span className="text-sm font-semibold flex-1" style={{ color: qStyles.text }}>
            {quadrantLabels[quadrant]}
          </span>
          <button
            onClick={() => setBloomedQuadrant(null)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors py-1 px-2"
          >
            show less &uarr;
          </button>
        </div>

        {/* All emotion circles */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="flex flex-wrap gap-2.5 justify-center">
            {emotionsList.map(e => renderCircle(e, 'bloomed'))}
          </div>

          {/* Search hint for other quadrants */}
          {otherQuadrantHints.length > 0 && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3 text-center">
              Also in:{' '}
              {otherQuadrantHints.map((h, i) => (
                <span key={h.quadrant}>
                  {i > 0 && ', '}
                  <button
                    onClick={() => setBloomedQuadrant(h.quadrant)}
                    className="underline hover:text-[var(--color-text-secondary)]"
                  >
                    {quadrantLabels[h.quadrant]} ({h.count})
                  </button>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] text-center mb-1">
        What emotions fit best?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-3">
        Tap all that apply — from any quadrant
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
              const dotColor = emotion ? quadrantStyles[emotion.quadrant]?.fill : undefined;
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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-2 flex flex-col">

        {/* ========== DEFAULT VIEW: 2×2 Grid ========== */}
        {isDefault && (
          <div className="flex flex-col gap-2">
            {/* Top row: HU + HP */}
            <div className="grid grid-cols-2 gap-2">
              {renderZone('high-unpleasant')}
              {renderZone('high-pleasant')}
            </div>

            {/* Bottom row: LU + LP */}
            <div className="grid grid-cols-2 gap-2">
              {renderZone('low-unpleasant')}
              {renderZone('low-pleasant')}
            </div>

            {/* Non-core search results */}
            {searchQuery && allSearchResults.length > 0 && (
              <div className="mt-1 px-1">
                <p className="text-xs text-[var(--color-text-tertiary)] mb-2">
                  More matches:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allSearchResults.map(emotion => {
                    const isSelected = selectedEmotions.includes(emotion.name);
                    const qStyles = quadrantStyles[emotion.quadrant];
                    return (
                      <button
                        key={emotion.id}
                        type="button"
                        onClick={() => toggleEmotion(emotion.name)}
                        style={{
                          backgroundColor: isSelected
                            ? qStyles.fill
                            : `color-mix(in srgb, ${qStyles.fill} 25%, transparent)`,
                          color: isSelected ? 'white' : qStyles.text,
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
              </div>
            )}

            {searchQuery && allSearchResults.length === 0 && (
              <p className="text-center text-[var(--color-text-tertiary)] mt-2 text-sm">
                No matches — click Add to use &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        )}

        {/* ========== BLOOMED VIEW ========== */}
        {!isDefault && (
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            {quadrantOrder.map(q =>
              q === bloomedQuadrant
                ? renderExpandedZone(q)
                : renderHeaderBar(q)
            )}
          </div>
        )}
      </div>

      {/* Action buttons — sticky bottom */}
      <div className="mt-3 flex gap-3" style={{ flexShrink: 0 }}>
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
