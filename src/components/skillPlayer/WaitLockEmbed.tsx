import { useEffect, useRef, useState } from 'react';
import { WaitLock } from '../tools/regulation/WaitLock';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * waitLock (docs/design/dbt-modules-plan.md C3b; owner DT, built in DT-02 Hold to wait): the shared wait lock as a
 * whole-screen step. A plain wait (no message to unlock): the ring fills on a timestamp deadline, so a backgrounded
 * tab can't drift it, and shows no digits. The way on (*I'm back*) is there from the first second: nothing locks.
 * Output: `waited` when the ring ran out first, `back_early` when the person came back before it did, with the
 * seconds since the screen opened.
 *
 * Props (copy props arrive as text): minutes, waiting (while the ring runs), done (once it has), doneShort (inside
 * the ring once it has), next (the way on).
 */
export function WaitLockEmbed({ props, onShown, onDone }: EmbedProps) {
  const minutes = typeof props.minutes === 'number' ? props.minutes : 10;
  const waiting = String(props.waiting ?? '');
  const done = String(props.done ?? '');
  const doneShort = String(props.doneShort ?? '');
  const next = String(props.next ?? '');
  const [started] = useState(() => Date.now());
  const [over, setOver] = useState(false);
  const shownOnce = useRef(false);
  useEffect(() => { if (!shownOnce.current) { shownOnce.current = true; onShown(); } }, [onShown]);
  const finish = () => onDone?.({
    ids: [over ? 'waited' : 'back_early'],
    durationSec: Math.max(0, Math.min(86_400, Math.round((Date.now() - started) / 1000))),
  });
  return (
    <section className="space-y-5" data-testid="wait-lock" data-over={over ? '' : undefined}>
      <WaitLock minutes={minutes} text={null} clock={false} onUnlocked={() => setOver(true)}
        c={{ locked: waiting, unlocked: done, unlockedShort: doneShort, waiting, done, copy: '', copied: '' }} />
      <button type="button" className={primaryButton} onClick={finish}>{next}</button>
    </section>
  );
}
