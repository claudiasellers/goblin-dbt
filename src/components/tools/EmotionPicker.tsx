import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { emotions, getEmotionById } from "../../data/emotions";
import "./EmotionPicker.css";

// Presentation metadata only. Clinical applicability still comes from the graph.
interface BroadGroup {
  id: string;
  label: string;
  families: string[];
  quickId?: string;
  cue: string;
  tint: string;
}
const groups: BroadGroup[] = [
  {
    id: "fearful",
    label: "Fearful",
    families: ["fearful"],
    quickId: "anxious",
    cue: "Something feels threatening, uncertain, or too much",
    tint: "#9785b5",
  },
  {
    id: "angry",
    label: "Angry",
    families: ["angry"],
    quickId: "angry",
    cue: "Something feels unfair, blocked, or disrespectful",
    tint: "#bf866c",
  },
  {
    id: "sad",
    label: "Sad",
    families: ["sad"],
    quickId: "sad",
    cue: "Something feels lost, missing, or painful",
    tint: "#739bb9",
  },
  {
    id: "disgusted",
    label: "Disgusted",
    families: ["disgusted"],
    quickId: "disgusted",
    cue: "Something feels off-putting or hard to be around",
    tint: "#8d9b78",
  },
  {
    id: "bad",
    label: "Stressed or drained",
    families: ["bad"],
    quickId: "stressed",
    cue: "I feel worn down or under pressure",
    tint: "#b19a72",
  },
  {
    id: "pleasant",
    label: "Something pleasant",
    families: ["happy", "surprised"],
    cue: "Something feels good, interesting, or surprising",
    tint: "#bb92a4",
  },
];

function orderedMembers(group: BroadGroup) {
  const members = emotions.filter(
    (e) => e.family && group.families.includes(e.family),
  );
  const primers = members.filter((e) => e.core).slice(0, 3);
  const first = primers.length ? primers : members.slice(0, 3);
  return [...first, ...members.filter((e) => !first.includes(e))];
}
function Disclosure({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="emotion-picker-disclosure"
      data-open={open}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="emotion-picker-disclosure-inner">
        <div className="px-4 pt-1 pb-4 space-y-3">{children}</div>
      </div>
    </div>
  );
}
interface EmotionPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onContinue: () => void;
  loading?: boolean;
  error?: string | null;
  prompt?: string;
  selectionMode?: "single" | "multiple";
}
export function EmotionPicker({
  selectedIds,
  onChange,
  onContinue,
  loading = false,
  error = null,
  prompt = "What are you feeling right now?",
  selectionMode = "multiple",
}: EmotionPickerProps) {
  const uid = useId();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [notSure, setNotSure] = useState(false);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [haptics, setHaptics] = useState(false);
  const suggestionHeading = useRef<HTMLHeadingElement>(null);
  const helperHeading = useRef<HTMLParagraphElement>(null);
  const groupButtons = useRef<Record<string, HTMLButtonElement | null>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const canVibrate =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
  const query = search.trim().toLowerCase();
  const suggested = groups.find((g) => g.id === suggestedId);
  const searchResults = useMemo(
    () =>
      query ? emotions.filter((e) => e.name.toLowerCase().includes(query)) : [],
    [query],
  );
  useEffect(() => {
    if (suggestedId) suggestionHeading.current?.focus();
  }, [suggestedId]);
  const bump = () => {
    if (
      !haptics ||
      !canVibrate ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    try {
      navigator.vibrate(8);
    } catch {
      /* Optional feedback must never block selection. */
    }
  };
  const toggle = (id: string) => {
    if (loading) return;
    bump();
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : selectionMode === "single"
          ? [id]
          : [...selectedIds, id],
    );
  };
  const add = (id: string) => {
    if (loading) return;
    bump();
    if (!selectedIds.includes(id))
      onChange(selectionMode === "single" ? [id] : [...selectedIds, id]);
  };
  const openGroup = (id: string) => {
    setExpandedGroup(id);
    setNotSure(false);
    setSuggestedId(null);
    requestAnimationFrame(() => groupButtons.current[id]?.focus());
  };
  const returnToCues = () => {
    setSuggestedId(null);
    requestAnimationFrame(() => helperHeading.current?.focus());
  };
  const selectedNames = selectedIds.map((id) => getEmotionById(id)?.name ?? id);
  const continueLabel =
    selectedIds.length === 1
      ? `Continue with ${selectedNames[0]}`
      : `Continue with ${selectedIds.length} emotions`;
  const chip = (id: string, name: string) => (
    <button
      key={id}
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={selectedIds.includes(id)}
      disabled={loading}
      className={`emotion-picker-chip min-h-11 px-4 py-2 text-sm rounded-full border ${selectedIds.includes(id) ? "bg-[var(--color-accent-fill)] border-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium" : "border-[var(--color-border)] text-[var(--color-text-secondary)]"}`}
    >
      {selectedIds.includes(id) && (
        <span aria-hidden="true" className="mr-1">
          ✓
        </span>
      )}
      {name}
    </button>
  );

  return (
    <div className="emotion-picker space-y-5" aria-busy={loading}>
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          {prompt}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Start with a broad feeling, or search for a word. You can change your
          choice.
        </p>
      </div>
      <p className="sr-only" role="status">
        {selectedNames.length
          ? `Selected: ${selectedNames.join(", ")}`
          : "No emotion selected"}
      </p>
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
            Selected
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Selected emotions">
            {selectedIds.map((id, i) => (
              <li key={id}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    toggle(id);
                    searchRef.current?.focus();
                  }}
                  aria-label={`Remove ${selectedNames[i]}`}
                  className="min-h-11 inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium"
                >
                  {selectedNames[i]}
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <label htmlFor={`${uid}-search`} className="sr-only">
          Search emotions
        </label>
        <input
          ref={searchRef}
          id={`${uid}-search`}
          type="search"
          disabled={loading}
          placeholder="Search for a word…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSuggestedId(null);
            setNotSure(false);
          }}
          className="w-full min-h-11 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        />
        {query && (
          <div className="mt-3 space-y-3">
            <p
              role="status"
              className="text-sm text-[var(--color-text-secondary)]"
            >
              {searchResults.length
                ? `${searchResults.length} matching ${searchResults.length === 1 ? "word" : "words"}`
                : "No matching words. Try another word or browse the groups."}
            </p>
            <div className="flex flex-wrap gap-2">
              {searchResults.map((e) => chip(e.id, e.name))}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
              className="min-h-11 text-sm text-[var(--color-accent)]"
            >
              Clear search and browse groups
            </button>
          </div>
        )}
      </div>
      {!query && (
        <div className="space-y-2">
          {groups.map((group) => {
            const expanded = expandedGroup === group.id;
            const members = orderedMembers(group);
            const count = members.filter((e) =>
              selectedIds.includes(e.id),
            ).length;
            const hint = members
              .slice(0, 3)
              .map((e) => e.name.toLowerCase())
              .join(", ");
            return (
              <div
                key={group.id}
                className="emotion-picker-category rounded-xl border border-[var(--color-border)]"
                style={{ "--emotion-tint": group.tint } as CSSProperties}
              >
                <button
                  ref={(el) => {
                    groupButtons.current[group.id] = el;
                  }}
                  type="button"
                  disabled={loading}
                  aria-expanded={expanded}
                  aria-controls={`${uid}-${group.id}`}
                  onClick={() => {
                    if (!expanded) bump();
                    setExpandedGroup(expanded ? null : group.id);
                    setNotSure(false);
                    setSuggestedId(null);
                  }}
                  className="w-full flex items-center justify-between gap-3 text-left p-4 min-h-14 rounded-xl"
                >
                  <span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {group.label}
                    </span>
                    <span className="block text-sm text-[var(--color-text-secondary)]">
                      {hint}
                      {count > 0 && ` · ${count} selected`}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="emotion-picker-indicator text-[var(--color-text-secondary)]"
                    data-open={expanded}
                  >
                    +
                  </span>
                </button>
                <Disclosure id={`${uid}-${group.id}`} open={expanded}>
                  <div className="flex flex-wrap gap-2">
                    {members.map((e) => chip(e.id, e.name))}
                  </div>
                </Disclosure>
              </div>
            );
          })}
          <div className="rounded-xl border border-dashed border-[var(--color-border)]">
            <button
              type="button"
              disabled={loading}
              aria-expanded={notSure}
              aria-controls={`${uid}-helper`}
              onClick={() => {
                if (!notSure) bump();
                setNotSure(!notSure);
                setSuggestedId(null);
                setExpandedGroup(null);
              }}
              className="w-full text-left p-4 min-h-14 font-medium text-[var(--color-text-secondary)] rounded-xl"
            >
              I'm not sure
            </button>
            <Disclosure id={`${uid}-helper`} open={notSure}>
              {suggested?.quickId ? (
                <div className="space-y-3">
                  <h4
                    ref={suggestionHeading}
                    tabIndex={-1}
                    className="font-semibold text-[var(--color-text-primary)]"
                  >
                    Does “
                    {getEmotionById(suggested.quickId)?.name.toLowerCase()}”
                    fit?
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    This is a possible word, not a conclusion. This suggestion
                    does not change your selection.
                  </p>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      add(suggested.quickId!);
                      openGroup(suggested.id);
                    }}
                    className="w-full min-h-11 p-3 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium"
                  >
                    Yes, select {getEmotionById(suggested.quickId)?.name}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => openGroup(suggested.id)}
                    className="w-full min-h-11 p-3 rounded-xl text-left border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    Explore nearby words
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={returnToCues}
                    className="w-full min-h-11 p-3 text-left text-[var(--color-text-secondary)]"
                  >
                    Try another description
                  </button>
                </div>
              ) : (
                <>
                  <p
                    ref={helperHeading}
                    tabIndex={-1}
                    className="text-sm text-[var(--color-text-secondary)]"
                  >
                    Which description is closest? You can explore without
                    choosing a label yet.
                  </p>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        bump();
                        if (g.quickId) setSuggestedId(g.id);
                        else openGroup(g.id);
                      }}
                      className="w-full text-left p-3 min-h-11 rounded-xl border border-[var(--color-border)] text-[var(--color-text-primary)]"
                    >
                      {g.cue}
                    </button>
                  ))}
                </>
              )}
            </Disclosure>
          </div>
        </div>
      )}
      {canVibrate && (
        <label className="min-h-11 flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={haptics}
            disabled={loading}
            onChange={(e) => setHaptics(e.target.checked)}
          />
          Gentle tap feedback (if supported)
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-1 px-1 py-2 bg-[var(--color-bg-primary)]/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={onContinue}
          disabled={
            loading ||
            selectedIds.length === 0 ||
            (selectionMode === "single" && selectedIds.length !== 1)
          }
          className={`emotion-picker-continue w-full min-h-12 py-3 px-4 rounded-xl font-medium ${selectedIds.length && !loading && (selectionMode !== "single" || selectedIds.length === 1) ? "bg-[var(--color-accent-fill)] text-[var(--color-on-accent)]" : "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] cursor-not-allowed"}`}
        >
          {loading
            ? "Loading…"
            : selectedIds.length === 0
              ? "Choose a feeling to continue"
              : selectionMode === "single" && selectedIds.length > 1
                ? "Choose one feeling to continue"
                : continueLabel}
        </button>
      </div>
    </div>
  );
}
