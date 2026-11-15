import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useDeadlineTimer } from '../../hooks/useDeadlineTimer';
import { BOWL, BOWL_SHOWN, bowlMs, bowlOutput, pebbleSpot } from '../../lib/pebbleBowl';
import { buzz } from '../tools/regulation/hooks';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The pebble bowl (MF-01 Notice it, name it; docs/design/notice-and-name.md): one noticing task for a set time, eyes
 * open. Each time attention comes back to the task (or, for Listen, each new sound) the person taps the big target and
 * a pebble drops into the bowl. Returns are marks, never a number (PRD – Mindfulness §4, rule 6): the count goes in the
 * report as a measure and nowhere on screen; the screen reader hears "A pebble in the bowl", not a count.
 *
 * Nothing locks: the way on is a quiet link from the start (`skip`), and the button once the time is up; `room` adds a
 * quiet *Back to the room* that reports `room` (MF rule 3, a stop that lands while noticing). No chime (MF rule 8: sound
 * off by default). While something covers the step (safety.open, P2) the end makes no buzz and takes no focus.
 * Reduced motion: pebbles appear in place instead of dropping. The rules are src/lib/pebbleBowl.ts (pure).
 */

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

export function PebbleBowl({ props, onShown, onDone, covered }: EmbedProps) {
  const shown = useRef(false);
  useEffect(() => { if (!shown.current) { shown.current = true; onShown(); } }, [onShown]);
  const reduce = !!useReducedMotion();
  const ms = bowlMs(props);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [pebbles, setPebbles] = useState(0);
  const [said, setSaid] = useState(0);
  const coveredRef = useRef(!!covered);
  coveredRef.current = !!covered;
  const timer = useDeadlineTimer({ durationMs: ms, tickMs: 250, chime: false, onDone: () => { if (!coveredRef.current) buzz(30); setEnded(true); } });
  const running = timer.state === 'running';
  const tapRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Focus follows the screen: Start → the tap target; the end → Next (not while something covers the step).
  useEffect(() => { if (started && !ended) tapRef.current?.focus({ preventScroll: true }); }, [started, ended]);
  useEffect(() => { if (ended && !covered) nextRef.current?.focus({ preventScroll: true }); }, [ended, covered]);

  const drop = () => { buzz(15); setPebbles((n) => n + 1); setSaid((n) => n + 1); };
  const report = (room: boolean) => {
    const fraction = ended ? 1 : running ? timer.fraction : 0;
    const ranMs = ended ? ms : running ? timer.elapsedMs : 0;
    timer.stop();
    const out = bowlOutput(started, fraction, ranMs, pebbles);
    onDone?.(room ? { ...out, ids: ['room'] } : out);
  };
  const quiet = text(props, 'skip') || text(props, 'next');

  return (
    <section className="space-y-5" data-testid="pebble-bowl" data-state={ended ? 'done' : running ? 'running' : 'idle'} data-pebbles={pebbles}>
      <p className="text-lg leading-snug text-[var(--color-text-primary)] text-balance">{text(props, 'task')}</p>
      {text(props, 'lead') && <p className="text-[var(--color-text-secondary)]">{text(props, 'lead')}</p>}

      <div className="flex flex-col items-center gap-4">
        {/* One slot the same size for Start, the tap target and the end line, so the bowl never jumps. */}
        <div className="h-40 w-full grid place-items-center">
          {!started && (
            <button type="button" className={primaryButton} data-bowl-start="" onClick={() => { setStarted(true); timer.start(); }}>
              {text(props, 'start')}
            </button>
          )}
          {started && !ended && (
            <button ref={tapRef} type="button" data-bowl-tap="" onClick={drop}
              className="w-40 h-40 rounded-full grid place-items-center select-none lift-secondary bg-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-bg-elevated))] border-2 border-[var(--color-accent)] text-lg font-medium text-[var(--color-text-primary)] active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-accent)]">
              <span className="max-w-[8rem] text-center text-balance">{text(props, 'tapLabel')}</span>
            </button>
          )}
          {ended && <p role="status" className="text-center text-[var(--color-text-secondary)]">{text(props, 'done')}</p>}
        </div>
        <Bowl pebbles={pebbles} reduce={reduce} fraction={ended ? 1 : running ? timer.fraction : 0} />
        {/* Announce each pebble, never how many (rule 6). `said` changes the text so a repeat is still read. */}
        <p className="sr-only" aria-live="polite">{said > 0 ? `${text(props, 'dropped')}${'\u200b'.repeat(said % 2)}` : ''}</p>
      </div>

      {started && !ended && <p className="text-center text-sm text-[var(--color-text-secondary)]">{text(props, 'running')}</p>}
      {ended
        ? <button ref={nextRef} type="button" className={primaryButton} onClick={() => report(false)}>{text(props, 'next')}</button>
        : (
          <div className="flex flex-col items-center gap-1">
            <button type="button" className={linkButton} onClick={() => report(false)}>{quiet}</button>
            {started && text(props, 'room') && <button type="button" className={linkButton} data-bowl-room="" onClick={() => report(true)}>{text(props, 'room')}</button>}
          </div>
        )}
    </section>
  );
}

/**
 * The bowl: a soft curve with the pebbles resting in it, and the time as a faint line along its rim (no digits). Past
 * the 24 it shows, each tap still gives the bowl a small settle, so a tap is never lost.
 */
function Bowl({ pebbles, reduce, fraction }: { pebbles: number; reduce: boolean; fraction: number }) {
  const { width: W, height: H, left, right, rimY, ctrlY } = BOWL;
  const curve = `M ${left} ${rimY} Q ${(left + right) / 2} ${ctrlY} ${right} ${rimY}`;
  const shownCount = Math.min(pebbles, BOWL_SHOWN);
  const t = Math.min(1, Math.max(0, fraction));
  const settle = !reduce && pebbles > BOWL_SHOWN;
  return (
    <svg aria-hidden="true" width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible" data-bowl=""
      key={settle ? pebbles : 'bowl'} style={settle ? { animation: 'pebble-settle 260ms var(--ease-enter) both' } : undefined}>
      <path d={curve} fill="var(--color-bg-elevated)" stroke="var(--color-text-tertiary)" strokeWidth={2} />
      {t > 0 && (
        <path d={curve} fill="none" stroke="var(--color-accent)" strokeWidth={3} strokeLinecap="round"
          pathLength={1} strokeDasharray={`${t} 1`} />
      )}
      {Array.from({ length: shownCount }, (_, i) => {
        const s = pebbleSpot(i);
        return (
          <circle key={i} cx={s.x} cy={s.y} r={s.r}
            fill={`color-mix(in srgb, var(--color-accent) ${100 - (i % 3) * 10}%, var(--color-bg-elevated))`}
            stroke="var(--color-bg-elevated)" strokeWidth={1.5}
            style={reduce ? undefined : { animation: 'pebble-drop 420ms var(--ease-enter) both' }} />
        );
      })}
      <style>{'@keyframes pebble-drop { from { transform: translateY(-90px); opacity: 0 } to { transform: none } } @keyframes pebble-settle { 50% { transform: translateY(2px) } }'}</style>
    </svg>
  );
}
