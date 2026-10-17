import { useEffect, useRef, useState } from 'react';
import { useProfileContext } from '../../hooks/useProfileContext';
import { queuePartCandidate, setPartShape, tagPart } from '../../services/parts';
import { newId } from '../../lib/spine/ids';
import { tagChips, tagRowCopy, type TagChip, type TagRowTool } from '../../lib/partTag';
import { SHAPE_DONE_MS, shapeOfferCopy } from '../../lib/partShape';
import { markTagRowAnswered, tagRowAnswered } from '../../lib/tagRowOnce';
import { debriefTag } from '../../lib/debriefWho';
import type { PartsContent } from '../../data/partsContentTypes';
import { PartFigure } from '../parts/PartFigure';
import { useStepFocus } from '../parts/stepFocus';

const chip = 'min-h-11 px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-accent)] transition-colors';
const quiet = 'min-h-11 px-3 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]';

/**
 * "Was this a part you know?" (docs/design/parts.md, "the stronger signal"): one quiet, skippable row
 * under a better or much better close. PartTagSlot mounts it only once its gate holds (src/lib/partTag.ts
 * tagRowGate), so the person's parts are read (the host tool's `parts` slice) only then. No parts kept:
 * nothing. One tap and it folds away with nothing more said; every write is fire and forget, so it
 * never blocks or delays leaving the tool. Skip and "No thanks" write nothing. With `offerShape` (Find the
 * feeling, a visit that made a shape: src/lib/partShape.ts) a part chip asks "Use this shape for {name}?"
 * first; Yes shows "Done." in place for a moment, then the row folds.
 *
 * No crisis banner here, even for a part whose `safety` flag is set (functions/src/safety/partSafetyFlag.ts):
 * a chip row after a better close isn't the moment. The part's own card, its check-backs and a visit to
 * it carry the banner instead.
 */
export function PartTagRow({ toolId, toolSessionId, content, onGone, question, debrief = false, offerShape = false }: {
  /** The host whose profile needs the parts are read under (a tag-row tool, or DEAR MAN's debrief). */
  toolId: TagRowTool | 'dear-man'; toolSessionId: string; content: PartsContent; onGone?: () => void;
  /** The row's question, when the host asks its own ("Was one of your parts there?"). */
  question?: string;
  /** DEAR MAN's debrief: a picked part is a debrief tag (strength yes), not a close tag. */
  debrief?: boolean;
  /** The host's gate held for "Use this shape for {name}?" (PartTagSlot: shapeOfferReady). */
  offerShape?: boolean;
}) {
  const profile = useProfileContext(toolId);
  const source = debrief ? 'debrief' : 'close';
  // Answered already on this page (the other place a host draws the row, or a remount): never asked twice.
  const [state, setState] = useState<'ask' | 'later' | 'shape' | 'done' | 'gone'>(() => (tagRowAnswered(toolSessionId, source) ? 'gone' : 'ask'));
  const [picked, setPicked] = useState<TagChip | null>(null);
  const fold = () => { setState('gone'); onGone?.(); };
  // Each tap replaces the control that had focus: focus moves to the new question or line, and when the
  // row folds away it stays where the row was (an empty anchor), never dropped to the top of the page.
  const root = useRef<HTMLDivElement>(null);
  const [shown] = useState(state !== 'gone');
  useStepFocus(root, state);
  // "Done." stays for a moment, then folds; the host's onGone is read when it fires (hosts pass a new one each render).
  const gone = useRef(onGone);
  useEffect(() => { gone.current = onGone; }, [onGone]);
  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => { setState('gone'); gone.current?.(); }, SHAPE_DONE_MS);
    return () => clearTimeout(t);
  }, [state]);
  if (state === 'gone' && shown) return <div ref={root} tabIndex={-1} className="focus:outline-none" />;
  if (state === 'gone' || !profile.slices) return null;
  const chips = tagChips(profile.slices.parts, content);
  if (chips.length === 0) return null;
  const copy = tagRowCopy(content);
  const ask = question ?? copy.question;

  const answered = () => markTagRowAnswered(toolSessionId, source);
  const skip = () => { answered(); fold(); };
  const tag = (c: TagChip) => {
    answered();
    if (offerShape && !debrief) {
      setPicked(c);
      setState('shape');
    } else fold();
    const req = debrief ? debriefTag(newId(), c.id, toolSessionId, 'yes') : { id: newId(), partId: c.id, toolSessionId };
    tagPart(req).catch(() => { /* a missed tag is only a missed signal */ });
  };
  const answerShape = (yes: boolean) => {
    if (!yes || !picked) { fold(); return; }
    setState('done');
    setPartShape({ partId: picked.id, toolSessionId }).catch(() => { /* the part keeps the shape it had */ });
  };

  if ((state === 'shape' || state === 'done') && picked) {
    const shape = shapeOfferCopy(content, picked);
    if (state === 'done') return <div ref={root}><p role="status" className="mt-4 text-sm text-[var(--color-text-secondary)] focus:outline-none">{shape.done}</p></div>;
    return (
      <section ref={root} aria-label={shape.ask} className="mt-4 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">{shape.ask}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chip} onClick={() => answerShape(true)}>{shape.yes}</button>
          <button type="button" className={quiet} onClick={() => answerShape(false)}>{shape.no}</button>
        </div>
      </section>
    );
  }
  const later = (yes: boolean) => {
    fold();
    if (yes) queuePartCandidate({ id: newId(), origin: 'new_one', moveIds: [], toolSessionId }).catch(() => { /* as above */ });
  };

  if (state === 'later') {
    return (
      <section ref={root} aria-label={copy.later} className="mt-4 space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">{copy.later}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={chip} onClick={() => later(true)}>{copy.yes}</button>
          <button type="button" className={quiet} onClick={() => later(false)}>{copy.no}</button>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} aria-label={ask} className="mt-4 space-y-3">
      <p className="text-sm text-[var(--color-text-secondary)]">{ask}</p>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button key={c.id} type="button" className={`${chip} inline-flex items-center gap-2 pl-2`} onClick={() => tag(c)}>
            <PartFigure shapeSig={c.shapeSig} size={28} />
            <span className={c.named ? 'font-serif text-base' : 'text-sm'}>{c.label}</span>
          </button>
        ))}
        <button type="button" className={chip} onClick={() => { answered(); setState('later'); }}>
          <span className="text-sm">{copy.newOne}</span>
        </button>
        <button type="button" className={quiet} onClick={skip}>{copy.skip}</button>
      </div>
    </section>
  );
}
