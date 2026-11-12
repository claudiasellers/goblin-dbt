import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getEmotionById, getEmotionByName } from "../../../data/emotions";
import { getToolById } from "../../../data/tools";
import { MAX_FEELINGS } from "../../../data/oppositeActionDoors";
import type { OppositeActionPickerContent } from "../../../data/oppositeActionPickerTypes";
import {
  addWords,
  doorsFrom,
  inRankOrder,
  nearestApplicable,
  tapRank,
  toggleDoor,
  type Door,
  type Pick,
} from "../../../lib/oppositeActionPicker";
import { describePlace, wordsNear, type SquarePoint } from "../../../lib/feelingSquare";
import { FeelingSquare } from "../../checkin/FeelingSquare";
import { WordChip } from "../../checkin/WordChips";
import { BodyStep, type BodyMark } from "../../checkin/body/BodyStep";
import { EmotionSuggestion } from "../../checkin/EmotionSuggestion";
import { EmotionPicker } from "../EmotionPicker";

type View = "doors" | "words" | "urge" | "named" | "body" | "suggest" | "map" | "order";

interface OppositeActionStartProps {
  content: OppositeActionPickerContent;
  picks: Pick[];
  onPicks: (picks: Pick[]) => void;
  /** Words handed in (check-in, body map, square, full list) that Do the Opposite doesn't work on. */
  skipped: string[];
  onSkipped: (ids: string[]) => void;
  /** Loudest first. */
  onStart: (picks: Pick[]) => void;
  loading: boolean;
  error: string;
}

/** How many words the square offers under the dot. */
const PEEK = 4;

const tint = (d: Door) => ({ ["--tint" as string]: d.tint }) as CSSProperties;
const nameOf = (id: string) => getEmotionById(id)?.name ?? id;

const primary =
  "w-full min-h-[60px] rounded-[18px] text-[17px] font-bold bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-none cursor-pointer disabled:cursor-default disabled:opacity-60 lift-primary";
const quietLink =
  "min-h-11 px-2 text-[15px] font-semibold text-[var(--color-accent)] bg-transparent border-none cursor-pointer";

function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start flex items-center gap-1 min-h-11 -ml-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      <span className="text-[15px] font-semibold">{children}</span>
    </button>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

/**
 * Do the Opposite's first step: which feelings, and which is loudest.
 *
 * The doors are the DBT parents Opposite Action works on (graph content), up to three at once. Three
 * other ways in sit under them, each reusing the check-in's own screen and landing back on the doors
 * with its answer picked: the urge ("what is it pushing you to do?"), the body (BodyStep, then the
 * body-first suggestions) and "not sure" (the feeling square, offering only words this skill works on).
 * The full word list catches everything else. With two or three picked, the person puts them in order.
 */
export function OppositeActionStart({
  content,
  picks,
  onPicks,
  skipped,
  onSkipped,
  onStart,
  loading,
  error,
}: OppositeActionStartProps) {
  const doors = doorsFrom(content);
  const doorOf = (parent: string) => doors.find((d) => d.parent === parent);
  const [view, setView] = useState<View>("doors");
  const [named, setNamed] = useState<string | null>(null);
  const [marks, setMarks] = useState<BodyMark[]>([]);
  const [point, setPoint] = useState<SquarePoint | null>(null);
  const [nearPicked, setNearPicked] = useState<string[]>([]);
  const [listPicked, setListPicked] = useState<string[]>([]);
  const [ranked, setRanked] = useState<string[]>([]);
  const [overflow, setOverflow] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  /** The body and suggestion views render another screen's heading: focus lands on its first heading. */
  const borrowed = useRef<HTMLDivElement>(null);
  const shownView = useRef(view);

  // Move focus to the new question when the view changes, not on first load (a focus ring around
  // the opening question reads as a bug, and nothing has moved yet).
  useEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    if (heading.current) { heading.current.focus(); return; }
    const root = borrowed.current;
    if (!root) return;
    const focusHeading = () => {
      const h = root.querySelector<HTMLElement>('h1, h2');
      if (!h) return false;
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      h.focus();
      return true;
    };
    if (focusHeading()) return;
    // The suggestions load first, then render their heading: focus it when it arrives.
    const watch = new MutationObserver(() => { if (focusHeading()) watch.disconnect(); });
    watch.observe(root, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [view]);

  const go = (next: View) => setView(next);
  const full = picks.length >= MAX_FEELINGS;

  /** Words chosen on another screen: pick them, say what couldn't go in, and come back to the doors. */
  const takeWords = (ids: string[]) => {
    const r = addWords(picks, content, ids);
    onPicks(r.picks);
    onSkipped(r.skipped);
    setOverflow(r.overflow);
    setRanked([]);
    go("doors");
  };

  const begin = () => {
    if (picks.length === 1) onStart(picks);
    else {
      setRanked([]);
      go("order");
    }
  };

  const title = (text: string, big = false) => (
    <h2
      ref={heading}
      tabIndex={-1}
      className={`m-0 outline-none [text-wrap:balance] text-[var(--color-text-primary)] ${big ? "text-[2.25rem] sm:text-[2.5rem] leading-[1.04]" : "text-[2rem] leading-[1.08]"}`}
    >
      {text}
    </h2>
  );

  if (view === "words") {
    return (
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <BackLink onClick={() => go("doors")}>Back to the feelings</BackLink>
        {title("Find the word")}
        <EmotionPicker
          selectedIds={listPicked}
          onChange={setListPicked}
          onContinue={() => {
            takeWords(listPicked);
            setListPicked([]);
          }}
          prompt="Which words fit right now?"
        />
      </div>
    );
  }

  if (view === "urge") {
    return (
      <div className="max-w-md mx-auto flex flex-col">
        <BackLink onClick={() => go("doors")}>Back to the feelings</BackLink>
        {title("What is it pushing you to do?")}
        <p className="mt-2 mb-4 text-[15px] text-[var(--color-text-secondary)]">
          Go with your gut. We’ll name the feeling from there.
        </p>
        <div className="border-t border-[var(--color-border-subtle)]">
          {doors.map((d) => (
            <button
              key={d.parent}
              type="button"
              className="oa-urge-row"
              style={tint(d)}
              onClick={() => {
                setNamed(d.parent);
                go("named");
              }}
            >
              <span className="oa-dot" aria-hidden="true" />
              <span className="flex-1">{d.urges.slice(0, 2).map((u) => u.label).join(" · ")}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[var(--color-text-tertiary)]"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <button type="button" className={quietLink} onClick={() => go("map")}>
            I’m not sure
          </button>
        </div>
      </div>
    );
  }

  if (view === "named" && named && doorOf(named)) {
    const d = doorOf(named)!;
    const already = picks.some((p) => p.parent === d.parent);
    return (
      <div className="max-w-md mx-auto flex flex-col">
        <BackLink onClick={() => go("urge")}>Back</BackLink>
        <p className="m-0 text-[14px] text-[var(--color-text-secondary)]">That urge usually comes from</p>
        <div className="oa-feeling mt-3" style={tint(d)}>
          <h2 ref={heading} tabIndex={-1} className="m-0 outline-none text-[3rem] leading-none text-[var(--color-text-primary)]">
            {d.label}
          </h2>
          {d.acknowledgment && (
            <p className="mt-3 mb-0 text-[16px] leading-relaxed text-[var(--color-text-primary)]">{d.acknowledgment}</p>
          )}
        </div>
        {full && !already && (
          <p className="mt-4 mb-0 text-[14px] text-[var(--color-text-secondary)]">
            You have three picked. Take one out on the feelings screen to add {d.label.toLowerCase()}.
          </p>
        )}
        <div className="action-dock flex flex-col gap-2">
          <button
            type="button"
            className={primary}
            disabled={full && !already}
            onClick={() => {
              if (!already) onPicks(toggleDoor(picks, d));
              setRanked([]);
              go("doors");
            }}
          >
            Yes, that’s it
          </button>
          <button type="button" className="den-chip w-full" onClick={() => go("urge")}>
            Not quite
          </button>
        </div>
      </div>
    );
  }

  if (view === "body") {
    return (
      <div className="flex flex-col" ref={borrowed}>
        <BackLink onClick={() => go("doors")}>Back to the feelings</BackLink>
        <BodyStep marks={marks} onChange={setMarks} onComplete={() => go("suggest")} onSkip={() => go("doors")} isSomaticEntry />
      </div>
    );
  }

  if (view === "suggest") {
    return (
      <div className="flex flex-col" ref={borrowed}>
        <BackLink onClick={() => go("body")}>Back to my body</BackLink>
        <EmotionSuggestion
          bodySensations={marks}
          onSelect={(names) =>
            takeWords(names.map((n) => getEmotionByName(n)?.id).filter((id): id is string => !!id))
          }
          onShowAllEmotions={() => go("words")}
          onSkip={() => go("doors")}
        />
      </div>
    );
  }

  if (view === "map") {
    const near = point
      ? nearestApplicable(wordsNear(point).map((e) => e.id), content, PEEK)
      : [];
    const shown = [...near, ...nearPicked.filter((id) => !near.includes(id))];
    return (
      <div className="max-w-md mx-auto flex flex-col">
        <BackLink onClick={() => go("doors")}>Back to the feelings</BackLink>
        {title("Where does it sit?", true)}
        <div className="mt-6 w-full max-w-[300px] min-[400px]:max-w-[340px] md:max-w-[392px] self-center">
          <FeelingSquare point={point} onMove={setPoint} />
        </div>
        <p
          className={`mt-5 text-center ${point ? "font-serif text-[17px] leading-[1.35] text-[var(--color-text-primary)]" : "text-[15px] text-[var(--color-text-secondary)]"}`}
        >
          {point ? describePlace(point) : "Touch where it sits. Close is enough."}
        </p>
        {point && (
          <div className="mt-4">
            <p className="m-0 mb-2 text-[13px] font-bold text-[var(--color-text-secondary)] text-center">
              {near.length ? "Near here. Tap the ones that fit." : "Nothing this skill works on sits right here. Try a little further out."}
            </p>
            <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Words near the dot">
              {shown.map((id) => (
                <WordChip
                  key={id}
                  name={nameOf(id)}
                  small
                  on={nearPicked.includes(id)}
                  onClick={() =>
                    setNearPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
                  }
                />
              ))}
            </div>
            <div className="mt-3 flex justify-center">
              <button type="button" className={quietLink} onClick={() => go("words")}>
                View more words
              </button>
            </div>
          </div>
        )}
        {nearPicked.length > 0 && (
          <div className="action-dock">
            <button
              type="button"
              className={primary}
              onClick={() => {
                takeWords(nearPicked);
                setNearPicked([]);
                setPoint(null);
              }}
            >
              {nearPicked.length === 1 ? `Use ${nameOf(nearPicked[0]).toLowerCase()}` : `Use these ${nearPicked.length}`}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === "order") {
    const all = picks.map((p) => p.parent);
    const complete = ranked.length === picks.length;
    const first = complete ? doorOf(ranked[0]) : undefined;
    return (
      <div className="max-w-md mx-auto flex flex-col">
        <div className="flex items-center justify-between">
          <BackLink onClick={() => go("doors")}>Change what I picked</BackLink>
          {ranked.length > 0 && (
            <button type="button" className="min-h-11 px-2 text-[14px] text-[var(--color-text-secondary)] bg-transparent border-none cursor-pointer" onClick={() => setRanked([])}>
              Reset order
            </button>
          )}
        </div>
        {title("Which is loudest?")}
        <p className="mt-2 mb-4 text-[15px] text-[var(--color-text-secondary)]">
          Tap them loudest first. We’ll work on them together, loudest at the top.
        </p>
        <div className="flex flex-col gap-3">
          {picks.map((p) => {
            const d = doorOf(p.parent);
            if (!d) return null;
            const rank = ranked.indexOf(p.parent);
            return (
              <button
                key={p.parent}
                type="button"
                className="oa-door oa-door--wide"
                style={tint(d)}
                aria-pressed={rank >= 0}
                aria-label={rank >= 0 ? `${d.label}, number ${rank + 1}` : d.label}
                onClick={() => setRanked((r) => tapRank(r, p.parent, all))}
              >
                <span className={`oa-rank${rank < 0 ? " is-empty" : ""}`} aria-hidden="true">
                  {rank >= 0 ? rank + 1 : ""}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="oa-door__name">{d.label}</span>
                  <span className="oa-door__urge">{p.fromDoor ? d.urges[0].label : nameOf(p.wordId)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 mb-0 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          Hard to say? Put first the one you’re closest to acting on.
        </p>
        {error && <p role="alert" className="mt-3 mb-0 text-[15px]">{error}</p>}
        <div className="action-dock">
          <button
            type="button"
            className={primary}
            disabled={!complete || loading}
            aria-busy={loading}
            onClick={() => onStart(inRankOrder(picks, ranked))}
          >
            {loading ? "One moment…" : first ? `Start with ${first.label.toLowerCase()}` : "Put them in order"}
          </button>
        </div>
      </div>
    );
  }

  // ── The doors ──
  const hint =
    picks.length === 0
      ? "Pick up to three. Mixed feelings are normal."
      : full
        ? "That’s three. Tap a picked one to swap it out."
        : picks.length === 1
          ? "Anything else in there? Up to three."
          : "You’ll choose the loudest next.";
  return (
    <div className="max-w-md mx-auto flex flex-col">
      <div className="flex items-start justify-between gap-4">
        {title("What’s in there right now?", true)}
        <button
          type="button"
          aria-label="Search for a word"
          className="shrink-0 mt-1 w-11 h-11 flex items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer"
          onClick={() => go("words")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        </button>
      </div>
      <p className="mt-2 mb-0 text-[15px] text-[var(--color-text-secondary)]" aria-live="polite">{hint}</p>

      {(skipped.length > 0 || overflow.length > 0) && (
        <div className="mt-4 p-4 rounded-2xl bg-[var(--color-bg-elevated)] text-[15px] leading-relaxed space-y-2">
          {skipped.length > 0 && (
            <p className="m-0">
              Do the Opposite isn’t the skill for {skipped.map((id) => nameOf(id).toLowerCase()).join(", ")}.{" "}
              <SkippedLink content={content} ids={skipped} />
            </p>
          )}
          {overflow.length > 0 && (
            <p className="m-0">
              {overflow.map(nameOf).join(", ")} didn’t fit: three is the most at once. Swap one in if it’s louder.
            </p>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2.5" role="group" aria-label="Feelings">
          {doors.map((d) => {
            const pick = picks.find((p) => p.parent === d.parent);
            const on = !!pick;
            return (
              <button
                key={d.parent}
                type="button"
                className="oa-door"
                style={tint(d)}
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => {
                  onPicks(toggleDoor(picks, d));
                  setRanked([]);
                  setOverflow([]);
                }}
              >
                {on && (
                  <span className="oa-door__mark">
                    <Check />
                  </span>
                )}
                <span className="oa-door__name">{d.label}</span>
                <span className="oa-door__urge">{pick && !pick.fromDoor ? nameOf(pick.wordId) : d.urges[0].label}</span>
              </button>
            );
          })}
        </div>

      <p className="mt-6 mb-2 text-[13px] font-bold text-[var(--color-text-secondary)]">Or start from</p>
      <div className="grid grid-cols-3 gap-2.5">
        <button type="button" className="den-chip den-chip--small" onClick={() => go("urge")}>
          The urge
        </button>
        <button type="button" className="den-chip den-chip--small den-chip--dt" onClick={() => go("body")}>
          <span className="gd" aria-hidden="true" />My body
        </button>
        <button type="button" className="den-chip den-chip--small den-chip--er" onClick={() => go("map")}>
          <span className="gd" aria-hidden="true" />Not sure
        </button>
      </div>
      <div className="mt-3 flex justify-center">
        <button type="button" className={quietLink} onClick={() => go("words")}>
          Calm, happy, tired or numb? Find your word
        </button>
      </div>

      {error && picks.length === 1 && <p role="alert" className="mt-3 mb-0 text-[15px]">{error}</p>}

      {picks.length > 0 && (
        <div className="action-dock">
          <button type="button" className={primary} disabled={loading} aria-busy={loading} onClick={begin}>
            {loading
              ? "One moment…"
              : picks.length === 1
                ? `Continue with ${doorOf(picks[0].parent)?.label.toLowerCase() ?? ""}`
                : `Next: which is loudest?`}
          </button>
        </div>
      )}
    </div>
  );
}

/** Where to go for words this skill doesn't work on: the graph's alternative when the app has it, else all tools. */
function SkippedLink({ content, ids }: { content: OppositeActionPickerContent; ids: string[] }) {
  const tool = ids
    .map((id) => content.words[id]?.alternativeSkill)
    .map((id) => (id ? getToolById(id.replace(/^dbt_/, "").replace(/_/g, "-")) : undefined))
    .find((t) => !!t);
  return (
    <Link className="font-semibold text-[var(--color-accent)] underline underline-offset-4" to={tool ? `/tool/${tool.id}` : "/tools"}>
      {tool ? `Try ${tool.name}` : "See other tools"} →
    </Link>
  );
}
