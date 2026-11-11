import { useEffect, useState } from 'react';
import { primaryButton, secondaryText } from '../oppositeAction/styles';
import { Padlock, ProgressRing } from './ProgressRing';
import { buzz, useLatest } from './hooks';

/** Graph copy for the lock (flow.copy.wait). */
export interface WaitLockCopy {
  locked: string; unlocked: string; unlockedShort: string;
  /** Shown without a message (plain wait): while waiting, and when the wait is over. */
  waiting: string; done: string; copy: string; copied: string;
}

// ── Wait lock. Deadline is a timestamp, so a backgrounded tab can't make it drift. ──
function useCountdown(ms: number) {
  const [endsAt] = useState(() => Date.now() + ms);
  const [now, setNow] = useState(() => Date.now());
  const left = Math.max(0, endsAt - now);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [left]);
  return { left, skip: () => setNow(endsAt) };
}

/**
 * Shared wait lock (used by Recover-from and DEAR MAN). Written now, sent later:
 * with `text`, the copy button appears only when the timer ends; without it, it's a plain wait.
 * The deadline is a timestamp, so a backgrounded tab can't make it drift.
 */
export function WaitLock({ minutes, text, c, onUnlocked, clock = true, centre }: {
  minutes: number; text: string | null; c: WaitLockCopy; onUnlocked?: () => void;
  /** false hides the mm:ss and the padlock (Hold to wait's phone-down wait never locks: the ring is the only progress). */
  clock?: boolean;
  /** With no clock: the short word inside the ring while it runs (and its accessible name), so it never looks empty. */
  centre?: string;
}) {
  const total = minutes * 60_000;
  const { left, skip } = useCountdown(total);
  const unlocked = left <= 0;
  const cb = useLatest(onUnlocked);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (unlocked) { buzz([20, 60, 20]); cb.current?.(); } }, [unlocked, cb]);
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  const copy = async () => { if (!text) return; try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setCopied(false); } };
  return (
    <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] flex flex-col items-center gap-4">
      <ProgressRing value={1 - left / total} size={128} label={unlocked ? c.unlockedShort : clock ? `${mm}:${ss}` : (centre ?? c.waiting)}>
        <div className="flex flex-col items-center gap-0.5">
          {clock && <Padlock closed={!unlocked} size={32} />}
          {(unlocked || clock || centre) && <span className="text-sm font-medium tabular-nums">{unlocked ? c.unlockedShort : clock ? `${mm}:${ss}` : centre}</span>}
        </div>
      </ProgressRing>
      <p className={`${secondaryText} text-center max-w-[36ch]`} aria-live="polite">
        {text ? (unlocked ? c.unlocked : c.locked) : (unlocked ? c.done : c.waiting)}
      </p>
      {unlocked && text && <button type="button" className={primaryButton} onClick={copy}>{copied ? c.copied : c.copy}</button>}
      {import.meta.env.DEV && !unlocked && (
        <button type="button" onClick={skip} className="min-h-11 px-3 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)] border border-dashed border-[var(--color-border)] rounded-full">
          dev: skip the wait
        </button>
      )}
    </div>
  );
}
