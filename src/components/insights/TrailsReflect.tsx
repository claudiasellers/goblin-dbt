import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { getPartsContent } from '../../services/partsContent';
import { answerKnownPartReview, getReflectTrails, removeTrailPattern } from '../../services/parts';
import type { PartsContent } from '../../data/partsContentTypes';
import type { KnownPartReviewBlock, KnownPartReviewClose, KnownPartRowAnswer, PlainTrailPattern } from '../../data/partsTypes';
import {
  knownPartReviewCopy, knownPartReviewReady, knownPartStatement, plainPatternStatement, plainPatternsCopy,
  plainPatternsReady, reviewRequest, reviewRows,
} from '../../lib/knownPartReview';
import { PartFigure } from '../parts/PartFigure';
import { focusLine, focusLost, focusStepStart } from '../parts/stepFocus';
import { CrisisBanner } from '../safety/CrisisBanner';

const chip = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] hover:text-[var(--color-text-primary)] disabled:opacity-50 aria-disabled:opacity-50 transition-colors';
const chipOn = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-[var(--color-border-accent)] text-[var(--color-text-primary)] bg-[var(--color-bg-subtle)] disabled:opacity-50 aria-disabled:opacity-50 transition-colors';
const card = 'rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6';

/**
 * Reflect's trails (docs/design/parts.md, Rules → rule D; The offer card): with parts on, after the parts
 * section. Rule D's batch: one block per part the server found (at most two), the part's figure and
 * "Was this {name}?" (an unnamed part: its chip label, then "Was this that part?"), a row
 * per moment (date, tool, context, what was picked: labels only) with Yes · No · Not sure, then Done / Not
 * now; either closes the block. A part with the safety flag shows CrisisBanner alongside. Then the trails
 * answered "It's how things go", as plain statements under their heading, each with a × to remove it.
 * Each part renders only with all of its copy signed off; a failed call keeps things as they were.
 */
export function TrailsReflect({ delay = 0 }: { delay?: number }) {
  const partsOn = useUserProfile().profile.partsEnabled;
  const [content, setContent] = useState<PartsContent | null>(null);
  const [reviews, setReviews] = useState<KnownPartReviewBlock[]>([]);
  const [patterns, setPatterns] = useState<PlainTrailPattern[]>([]);
  const ready = !!content && (knownPartReviewReady(content) || plainPatternsReady(content));
  // After a block closes or a pattern goes, focus stays in the section (lane 1's stepFocus convention):
  // the next question or ×, else the section's own place once everything is gone.
  const root = useRef<HTMLDivElement>(null);
  const [acted, setActed] = useState(0);
  useEffect(() => { if (acted) focusStepStart(root.current); }, [acted]);

  useEffect(() => {
    if (!partsOn || content) return;
    let live = true;
    getPartsContent().then((c) => { if (live) setContent(c); }).catch(() => { /* no section */ });
    return () => { live = false; };
  }, [partsOn, content]);

  useEffect(() => {
    if (!partsOn || !ready) return;
    let live = true;
    getReflectTrails().then((r) => {
      if (!live) return;
      setReviews(r.reviews);
      setPatterns(r.patterns);
    }).catch(() => { /* no section */ });
    return () => { live = false; };
  }, [partsOn, ready]);

  if (!partsOn || !content) return null;
  const shownReviews = knownPartReviewReady(content) ? reviews.filter((b) => knownPartStatement(b, content)) : [];
  const shownPatterns = plainPatternsReady(content)
    ? patterns.map((p) => ({ p, line: plainPatternStatement(p) })).filter((x): x is { p: PlainTrailPattern; line: string } => !!x.line)
    : [];
  if (shownReviews.length === 0 && shownPatterns.length === 0) {
    // Everything answered or removed here: an empty place keeps focus where the section was.
    return acted ? <div ref={root} tabIndex={-1} className="outline-none" /> : null;
  }
  const style = { animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` };

  return (
    <div ref={root} className="space-y-4">
      {shownReviews.map((b) => (
        <KnownPartReview key={b.partId} block={b} content={content} style={style}
          onDone={(id) => { setReviews((rs) => rs.filter((x) => x.partId !== id)); setActed((n) => n + 1); }} />
      ))}
      {shownPatterns.length > 0 && (
        <PlainPatterns items={shownPatterns} content={content} style={style}
          onRemoved={(id) => { setPatterns((ps) => ps.filter((x) => x.offerId !== id)); setActed((n) => n + 1); }} />
      )}
    </div>
  );
}

function KnownPartReview({ block, content, style, onDone }: {
  block: KnownPartReviewBlock;
  content: PartsContent;
  style: CSSProperties;
  onDone: (partId: string) => void;
}) {
  // One batch id per block, so a retry after a failed save is the same batch.
  const batchId = useRef<string>(crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, KnownPartRowAnswer>>({});
  const [busy, setBusy] = useState(false);
  const statement = knownPartStatement(block, content);
  if (!statement) return null;
  const copy = knownPartReviewCopy(content);
  const rows = reviewRows(block);

  // aria-disabled while it saves, not disabled: a disabled button would drop keyboard focus.
  const close = async (c: KnownPartReviewClose) => {
    if (busy) return;
    setBusy(true);
    try {
      await answerKnownPartReview(reviewRequest(batchId.current, block, answers, c));
      onDone(block.partId);
    } catch { /* the block stays as it was */ } finally { setBusy(false); }
  };

  return (
    <section aria-label={statement.question} data-testid="known-part-review" className={card} style={style}>
      <div className="flex items-start gap-3">
        <PartFigure shapeSig={block.shapeSig} size={44} className="flex-shrink-0" />
        <div className="min-w-0 flex-1">
          {/* A named part's name is already in the question; an unnamed one is introduced by its chip label. */}
          {!block.name?.trim() && <p className="text-sm text-[var(--color-text-primary)]">{statement.heading}</p>}
          <h3 className="font-serif text-lg font-normal leading-snug text-[var(--color-text-primary)]">{statement.question}</h3>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-[var(--color-border-subtle)]">
        {rows.map((r) => (
          <li key={r.key} className="py-3 first:pt-0 last:pb-0">
            <p className="text-sm text-[var(--color-text-primary)]">
              {[r.date, r.tool].filter(Boolean).join(' · ')}
            </p>
            {(r.context || r.source) && (
              <p className="text-sm text-[var(--color-text-secondary)]">{[r.context, r.source].filter(Boolean).join(' · ')}</p>
            )}
            <div role="group" aria-label={[r.date, r.tool].filter(Boolean).join(', ')} className="mt-2 grid grid-cols-3 gap-2">
              {copy.answers.map((a) => {
                const on = answers[r.episodeId] === a.answer;
                return (
                  <button key={a.id} type="button" aria-pressed={on} aria-disabled={busy || undefined} className={on ? chipOn : chip}
                    onClick={() => { if (!busy) setAnswers((x) => ({ ...x, [r.episodeId]: a.answer })); }}>
                    {a.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" aria-disabled={busy || undefined} className={chip} onClick={() => void close('done')}>{copy.done}</button>
        <button type="button" aria-disabled={busy || undefined} className={chip} onClick={() => void close('not_now')}>{copy.notNow}</button>
      </div>
      {block.safety && <div className="mt-3"><CrisisBanner compact /></div>}
    </section>
  );
}

function PlainPatterns({ items, content, style, onRemoved }: {
  items: Array<{ p: PlainTrailPattern; line: string }>;
  content: PartsContent;
  style: CSSProperties;
  onRemoved: (offerId: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const removedAt = useRef<number | null>(null);
  const copy = plainPatternsCopy(content);
  // The × that went: focus the next one (or the one before it, at the end).
  useEffect(() => {
    const i = removedAt.current;
    removedAt.current = null;
    if (i === null || !focusLost()) return;
    const xs = list.current?.querySelectorAll<HTMLElement>('button') ?? [];
    if (xs.length) focusLine(xs[Math.min(i, xs.length - 1)]);
  }, [items.length]);
  const remove = async (offerId: string) => {
    if (busy) return;
    setBusy(offerId);
    try {
      await removeTrailPattern({ offerId });
      removedAt.current = items.findIndex((x) => x.p.offerId === offerId);
      onRemoved(offerId);
    } catch { /* the line stays */ } finally { setBusy(null); }
  };
  return (
    <section aria-label={copy.title} data-testid="plain-patterns" className={card} style={style}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-4">{copy.title}</h3>
      <ul ref={list} className="divide-y divide-[var(--color-border-subtle)]">
        {items.map(({ p, line }) => (
          <li key={p.offerId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <p className="min-w-0 flex-1 text-sm text-[var(--color-text-primary)]">{line}</p>
            <button type="button" aria-label={`${copy.remove}: ${line}`} aria-disabled={busy === p.offerId || undefined}
              className="-my-2 -mr-2 min-h-11 min-w-11 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] aria-disabled:opacity-50"
              onClick={() => void remove(p.offerId)}>
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
