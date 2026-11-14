import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { printAt, turnOutput } from '../../lib/turnFork';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * turnFork (DT-04 part 2 turning the mind, docs/design/let-it-be.md; plan C3b, DT-owned): the fork in the road. Two
 * paths part: the fight with it, and letting it be. Each tap on *Turn* walks the small figure a little way toward
 * letting it be and leaves a footprint there; then the figure drifts back to the fork, because the mind turns back
 * (Handout 12: you turn it again). The footprints are the only count: no digits. Nothing locks: *Done* is there after
 * the first turn, and a quiet way on before it. Reduced motion: the figure stays at the fork and only footprints appear.
 *
 * Props (copy props arrive as text): turn (the button), again (the button after a turn), turnedLine (said after a turn),
 * fightLabel, letLabel (the two paths), hint (for a screen reader), done, skip. Reports `turned` · `skipped`, the turns
 * (`doneCount`) and the seconds.
 */
export function TurnFork({ props, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const reduce = useReducedMotion();
  const [turns, setTurns] = useState(0);
  const [out, setOut] = useState(false);
  const started = useRef(performance.now());
  const back = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintId = useId();
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  useEffect(() => () => { if (back.current) clearTimeout(back.current); }, []);

  const turn = () => {
    buzz(15);
    setTurns((n) => n + 1);
    if (reduce) return;
    setOut(true);
    if (back.current) clearTimeout(back.current);
    back.current = setTimeout(() => setOut(false), 2200);
  };
  const finish = () => onDone?.(turnOutput(turns, performance.now() - started.current));
  const prints = Array.from({ length: turns }, (_, i) => printAt(i)).filter((p): p is NonNullable<ReturnType<typeof printAt>> => !!p);
  // The figure: at the fork, or a few steps up the letting-it-be path just after a turn.
  const fig = out ? { x: 150, y: 110 } : { x: 120, y: 156 };

  return (
    <section className="space-y-5" data-testid="turn-fork" data-turns={turns}>
      <div className="flex justify-center">
        <svg viewBox="0 0 240 200" width="240" height="200" aria-hidden="true" className="overflow-visible max-w-full">
          {/* The way here, then the fork: the fight (left, rough) and letting it be (right, smooth). */}
          <path d="M120 196 L120 150" stroke="var(--color-text-tertiary)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.45" />
          <path d="M120 150 L96 120 L70 104 L58 72 L36 52 L40 30" stroke="var(--color-text-tertiary)" strokeWidth="12"
            strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.35" />
          <path d="M120 150 Q150 110 200 30" stroke="var(--color-accent)" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.35" />
          <text x="44" y="18" textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">{text('fightLabel')}</text>
          <text x="200" y="18" textAnchor="middle" fontSize="11" fill="var(--color-text-secondary)">{text('letLabel')}</text>
          {prints.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx="3.5" ry="6" transform={`rotate(${p.r} ${p.x} ${p.y})`}
              fill="var(--color-accent)" opacity="0.8" />
          ))}
          <g style={{ transform: `translate(${fig.x}px, ${fig.y}px)`, transition: reduce ? undefined : 'transform 700ms ease-in-out' }}>
            <circle cx="0" cy="-16" r="6" fill="var(--color-text-secondary)" />
            <rect x="-5" y="-9" width="10" height="16" rx="5" fill="var(--color-text-secondary)" />
          </g>
        </svg>
      </div>
      <span id={hintId} hidden>{text('hint')}</span>
      <p className="sr-only" aria-live="polite">{turns > 0 ? text('turnedLine') : ''}</p>
      {turns > 0 && <p className="text-center text-[var(--color-text-secondary)]">{text('turnedLine')}</p>}
      <button type="button" aria-describedby={hintId} className={primaryButton} onClick={turn} data-turn="">
        {turns > 0 ? text('again') : text('turn')}
      </button>
      <div className="flex justify-center pt-2">
        <button type="button" className={linkButton} onClick={finish}>{turns > 0 ? text('done') : text('skip')}</button>
      </div>
    </section>
  );
}
