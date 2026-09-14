import { useMemo, useState } from 'react';
import { emotions, getEmotionById } from '../../data/emotions';

/**
 * Broad-first emotion picker used by tools that need emotion IDs
 * (Problem Solve, Opposite Action).
 *
 * Presentation only: group labels, hints and ordering live here. Which
 * emotions a tool applies to is still decided by the graph via the Cloud
 * Function the tool calls with the selected IDs.
 */

interface BroadGroup {
  id: string;
  label: string;
  /** Emotion families (from src/data/emotions.ts) shown when expanded. */
  families: string[];
  /** Emotion ID used when the user wants to proceed with just the broad choice. */
  quickId?: string;
  /** Plain-language cue shown in the "I'm not sure" helper. */
  cue: string;
}

const groups: BroadGroup[] = [
  { id: 'fearful', label: 'Fearful', families: ['fearful'], quickId: 'anxious', cue: 'Something feels threatening, uncertain, or too much' },
  { id: 'angry', label: 'Angry', families: ['angry'], quickId: 'angry', cue: "Something's unfair, blocked, or disrespectful" },
  { id: 'sad', label: 'Sad', families: ['sad'], quickId: 'sad', cue: "Something's lost, missing, or hurting" },
  { id: 'disgusted', label: 'Disgusted', families: ['disgusted'], quickId: 'disgusted', cue: 'Something feels wrong, off-putting, or beneath you' },
  { id: 'bad', label: 'Stressed or drained', families: ['bad'], quickId: 'stressed', cue: "Worn down, under pressure, or just 'bad'" },
  { id: 'pleasant', label: 'Something pleasant', families: ['happy', 'surprised'], cue: 'Mostly good, but something is still nagging' },
];

interface EmotionPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onContinue: () => void;
  loading?: boolean;
  error?: string | null;
  /** Shown above the groups, e.g. "What are you feeling right now?" */
  prompt?: string;
}

export function EmotionPicker({
  selectedIds,
  onChange,
  onContinue,
  loading = false,
  error = null,
  prompt = 'What are you feeling right now?',
}: EmotionPickerProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [notSure, setNotSure] = useState(false);
  const [search, setSearch] = useState('');

  const query = search.trim().toLowerCase();

  const searchResults = useMemo(
    () => (query ? emotions.filter(e => e.name.toLowerCase().includes(query)) : []),
    [query]
  );

  const membersOf = (group: BroadGroup) =>
    emotions.filter(e => e.family && group.families.includes(e.family));

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  const add = (id: string) => {
    if (!selectedIds.includes(id)) onChange([...selectedIds, id]);
  };

  const selectedNames = selectedIds.map(id => getEmotionById(id)?.name ?? id);
  const continueLabel = selectedIds.length === 1
    ? `Continue with ${selectedNames[0]}`
    : `Continue with ${selectedIds.length} emotions`;

  const chipClass = (selected: boolean) =>
    `min-h-11 px-4 py-2 text-sm rounded-full border transition-colors ${
      selected
        ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium'
        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
    }`;

  const renderChip = (id: string, name: string) => {
    const selected = selectedIds.includes(id);
    return (
      <button
        key={id}
        type="button"
        onClick={() => toggle(id)}
        aria-pressed={selected}
        disabled={loading}
        className={chipClass(selected)}
      >
        {selected && <span aria-hidden="true" className="mr-1">✓</span>}
        {name}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{prompt}</h3>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Start broad. You can add specific words after, or search for one you already have in mind.
        </p>
      </div>

      {/* Selected emotions — semantic list, removable */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
            Selected
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Selected emotions">
            {selectedIds.map((id, i) => (
              <li key={id} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium">
                {selectedNames[i]}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${selectedNames[i]}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search across the full vocabulary */}
      <div>
        <label htmlFor="emotion-search" className="sr-only">Search emotions</label>
        <input
          id="emotion-search"
          type="search"
          placeholder="Search for a word…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        {query && (
          <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
            {searchResults.length > 0
              ? searchResults.map(e => renderChip(e.id, e.name))
              : <p className="text-sm text-[var(--color-text-tertiary)]">No matches. Try a broader group below.</p>}
          </div>
        )}
      </div>

      {/* Broad groups (≤ 8 choices initially) */}
      {!query && (
        <div className="space-y-2">
          {groups.map(group => {
            const expanded = expandedGroup === group.id;
            const members = membersOf(group);
            const selectedInGroup = members.filter(m => selectedIds.includes(m.id)).length;
            const hint = members.filter(m => m.core).slice(0, 3).map(m => m.name.toLowerCase()).join(', ')
              || members.slice(0, 3).map(m => m.name.toLowerCase()).join(', ');
            return (
              <div key={group.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
                <button
                  type="button"
                  onClick={() => { setExpandedGroup(expanded ? null : group.id); setNotSure(false); }}
                  aria-expanded={expanded}
                  className="w-full flex items-center justify-between gap-3 text-left p-4 min-h-14 rounded-xl"
                >
                  <span>
                    <span className="font-medium text-[var(--color-text-primary)]">{group.label}</span>
                    <span className="block text-sm text-[var(--color-text-tertiary)]">
                      {selectedInGroup > 0 ? `${selectedInGroup} selected` : hint}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-[var(--color-text-tertiary)]">{expanded ? '−' : '+'}</span>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {group.quickId && !selectedIds.includes(group.quickId) && (
                      <button
                        type="button"
                        onClick={() => add(group.quickId!)}
                        className="text-sm font-medium text-[var(--color-accent)] hover:underline min-h-11"
                      >
                        Not sure which — just go with “{getEmotionById(group.quickId)?.name}”
                      </button>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {members.map(e => renderChip(e.id, e.name))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncertainty path */}
          <div className="rounded-xl border border-dashed border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => { setNotSure(!notSure); setExpandedGroup(null); }}
              aria-expanded={notSure}
              className="w-full text-left p-4 min-h-14 font-medium text-[var(--color-text-secondary)] rounded-xl"
            >
              I'm not sure
            </button>
            {notSure && (
              <div className="px-4 pb-4 space-y-2">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  That's okay. Which of these is closest?
                </p>
                {groups.filter(g => g.quickId).map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { add(g.quickId!); setNotSure(false); setExpandedGroup(g.id); }}
                    className="w-full text-left p-3 rounded-lg border border-[var(--color-border)] lift-secondary"
                  >
                    <span className="block text-[var(--color-text-primary)]">{g.cue}</span>
                    <span className="block text-xs text-[var(--color-text-tertiary)] mt-0.5">{g.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>
      )}

      {/* Continuation stays reachable without covering choices */}
      <div className="sticky bottom-0 -mx-1 px-1 py-2 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={onContinue}
          disabled={loading || selectedIds.length === 0}
          aria-busy={loading}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50"
        >
          {loading ? 'Loading…' : selectedIds.length === 0 ? 'Pick at least one to continue' : continueLabel}
        </button>
      </div>
    </div>
  );
}
