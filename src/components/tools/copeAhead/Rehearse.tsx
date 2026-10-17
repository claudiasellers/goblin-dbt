import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotionConfig } from 'motion/react';
import type { CopeAheadContent } from '../../../data/copeAheadTypes';
import { focusLine } from '../../../lib/focusStart';
import { primaryButton } from '../oppositeAction/styles';
import { PlanSentence, type PlanParts } from './PlanSentence';

/**
 * Cope Ahead, screen 5: Rehearse it (docs/design/cope-ahead.md). The rehearsal beats from cope-ahead.json,
 * one per tap (*Next*), no timer. Beat 7 (*Then it's over.*) sits under beat 6 on the same screen. The
 * second pass (`pass` 2, *Once more, with something you didn't expect?*) starts at beat 3 with
 * `rehearse_new_problem` above it. Presentation only: the page owns the step machine and the session; this
 * reports the last beat's Next through `onDone`.
 *
 * A dim 2D panel in the room's tokens sits above the beat; it brightens one step on the plan beat and stays
 * bright for 6–7. With reduced motion it changes with no transition. Each beat is a polite live line and
 * takes focus as it arrives.
 */
export interface RehearseProps {
  /** Beats + flow copy. */
  content: CopeAheadContent;
  /** The moment's ifText, or own words. */
  moment: string;
  plan: PlanParts;
  /** 2: rehearse_new_problem above beat 3, starts at beat 3. */
  pass: 1 | 2;
  /** After the last beat's Next. */
  onDone: () => void;
}

/** The screens, by beat order: 7 joins 6. */
const SCREENS: Record<1 | 2, number[][]> = {
  1: [[1], [2], [3], [4], [5], [6, 7]],
  2: [[3], [4], [5], [6, 7]],
};
/** The plan beat: the panel brightens here and stays bright. */
const PLAN_BEAT = 5;

/** Own words end the sentence the beat already ends: a closing full stop or comma is dropped. */
const clause = (s: string) => s.trim().replace(/[\s.,]+$/u, '');

export function Rehearse({ content, moment, plan, pass, onDone }: RehearseProps) {
  const reduce = useReducedMotionConfig() === true;
  const screens = SCREENS[pass];
  const [at, setAt] = useState(0);
  const beats = screens[at];
  const bright = beats[0] >= PLAN_BEAT;
  const text = (order: number) => content.beats.find((b) => b.order === order)?.text ?? '';
  const copy = (k: string) => content.copy[k] ?? '';

  const top = useRef<HTMLHeadingElement>(null);
  const beat = useRef<HTMLParagraphElement>(null);
  const opened = useRef(false);
  // The screen's start as it opens (the intro, or the new problem), then each beat's own text.
  useEffect(() => {
    if (!opened.current) { opened.current = true; focusLine(top.current ?? beat.current); return; }
    focusLine(beat.current);
  }, [at]);

  const line = (order: number) => {
    const t = text(order);
    if (t.includes('{plan}')) {
      const [before, after = ''] = t.split('{plan}');
      return <>{before}<PlanSentence content={content} plan={plan} />{after}</>;
    }
    return t.replace('{moment}', clause(moment));
  };

  const heading = pass === 1 ? copy('rehearse_intro') : beats[0] === 3 ? copy('rehearse_new_problem') : '';
  const last = at === screens.length - 1;
  return (
    <section className="space-y-5" data-testid="cope-rehearse" data-pass={pass} data-beat={beats[0]}>
      {heading && (
        <h2 ref={top} tabIndex={-1} className="text-lg font-medium text-[var(--color-text-primary)] text-balance focus:outline-none">{heading}</h2>
      )}
      <Panel bright={bright} reduce={reduce} />
      <div aria-live="polite" className="space-y-3 min-h-24 [overflow-wrap:anywhere]">
        {beats.map((order, i) => (
          <p key={`${at}-${order}`} ref={i === 0 ? beat : undefined} tabIndex={i === 0 ? -1 : undefined} data-beat-order={order}
            className="font-serif text-xl leading-snug text-[var(--color-text-primary)] text-balance focus:outline-none">
            {line(order)}
          </p>
        ))}
      </div>
      <button type="button" className={primaryButton} onClick={() => (last ? onDone() : setAt((n) => n + 1))}>
        {copy('rehearse_next')}
      </button>
    </section>
  );
}

/**
 * The scene: a quiet horizon and a soft light, both from the room's tokens. Dim until the plan beat, then
 * one step brighter. Decorative (the beats carry the meaning).
 */
function Panel({ bright, reduce }: { bright: boolean; reduce: boolean }) {
  const fade = reduce ? '' : 'transition-opacity duration-700 ease-out';
  const id = `cope-rehearse-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <svg viewBox="0 0 320 120" className="block w-full h-auto rounded-3xl bg-[var(--color-bg-secondary)]" aria-hidden="true" data-bright={bright ? '1' : '0'}>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0.7 }} />
          <stop offset="1" style={{ stopColor: 'var(--color-accent)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="320" height="120" style={{ fill: 'var(--color-accent)' }} className={fade} opacity={bright ? 0.1 : 0.03} />
      <circle cx="160" cy="78" r="70" fill={`url(#${id})`} className={fade} opacity={bright ? 0.65 : 0.22} />
      <line x1="24" y1="84" x2="296" y2="84" style={{ stroke: 'var(--color-text-tertiary)' }} strokeWidth="1" className={fade} opacity={bright ? 0.5 : 0.25} />
      <circle cx="160" cy="84" r="5" style={{ fill: 'var(--color-accent)' }} className={fade} opacity={bright ? 0.9 : 0.45} />
    </svg>
  );
}
