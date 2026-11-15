import { useEffect, useRef, useState } from 'react';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { choiceButton, linkButton, primaryButton } from '../tools/oppositeAction/styles';
import { lineText, pocketSides, pocketText, type PocketCardSide } from '../../lib/pocketCard';
import type { EmbedProps } from './embeds';

// `choiceButton` sets text-left; the copy button reads centred.
const secondaryButton = `${choiceButton} !text-center`;

/**
 * The pocket card (plan C3b `pocketCard`, IE-01 Mode C; docs/design/dear-man-prep.md): DEAR MAN's plan on three cards,
 * read one at a time (say it · stay steady · if they push back), no input. Copy puts the whole plan on the clipboard
 * (or selects it). Reports `seen_all` once every card has been shown and `copied`, never the words. Nothing to show
 * (content drift) never strands the person: the way on is always there.
 */
export function PocketCard({ props, picked, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const list = (k: string) => (Array.isArray(props[k]) ? (props[k] as unknown[]).filter((x): x is string => typeof x === 'string') : []);
  const field = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : undefined);
  const labels: Record<string, string> = {};
  for (const ab of ['A', 'B']) {
    const f = field(`label${ab}Field`);
    if (f && text(`label${ab}`)) labels[f] = text(`label${ab}`);
  }
  const sides = pocketSides({
    say: list('say'), steady: list('steady'), push: list('push'), fill: field('fill'), detail: field('detail'),
    joinField: field('joinField'), joinLead: text('joinLead') || undefined, labels,
    steadyNotes: [text('steadyNoteA'), text('steadyNoteB')].filter(Boolean),
    ...(text('levelNote') ? { lead: { text: text('levelNote'), ...(text('levelLabel') ? { label: text('levelLabel') } : {}) } } : {}),
  }, picked);
  const heading = (k: PocketCardSide['key']) => text(`${k}Label`);
  const [at, setAt] = useState(0);
  const seen = useRef(new Set<number>([0]));
  const done = useRef(new Set<string>());
  const [status, setStatus] = useState('');
  // The whole plan, hidden: what Copy's fallback selects when the clipboard is blocked (never only the card in view).
  const textRef = useRef<HTMLPreElement>(null);
  useEffect(() => { if (sides.length) onShown(); }, [sides.length, onShown]);
  useEffect(() => {
    seen.current.add(at);
    if (sides.length && seen.current.size >= sides.length) done.current.add('seen_all');
  }, [at, sides.length]);

  const next = (
    <button type="button" className={sides.length ? linkButton : primaryButton}
      onClick={() => onDone?.({ ids: [...done.current] })}>{(sides.length && text('skipLabel')) || text('next')}</button>
  );
  if (!sides.length) return <div className="flex justify-center">{next}</div>;
  const side = sides[Math.min(at, sides.length - 1)];
  const all = pocketText(sides, heading);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(all);
      done.current.add('copied');
      setStatus(text('copiedLabel'));
    } catch {
      const el = textRef.current;
      const sel = window.getSelection();
      if (el && sel) {
        el.hidden = false;
        const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r);
      }
      setStatus(text('selectedLabel'));
    }
  };

  return (
    <div className="space-y-5" data-testid="pocket-card">
      <PaperCard label={[heading(side.key), ...side.lines.map(lineText)].join('. ')}>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">{heading(side.key)}</p>
          {side.lines.map((l, i) => (
            <div key={i}>
              {l.label && <p className="text-xs text-[var(--color-text-tertiary)]">{l.label}</p>}
              <p className={l.note ? 'text-sm italic text-[var(--color-text-secondary)]' : paperLine}>{l.text}</p>
            </div>
          ))}
        </div>
      </PaperCard>
      {sides.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          {/* aria-disabled, never disabled: a disabled button under focus drops focus to the page. */}
          <button type="button" className={`${linkButton} aria-disabled:opacity-40`} aria-disabled={at === 0}
            onClick={() => setAt((n) => Math.max(0, n - 1))}>{text('prevLabel')}</button>
          <div className="flex gap-2" aria-hidden="true">
            {sides.map((s, i) => <span key={s.key} className={`w-2 h-2 rounded-full ${i === at ? 'bg-[var(--color-accent-fill)]' : 'bg-[var(--color-border)]'}`} />)}
          </div>
          <button type="button" className={`${linkButton} aria-disabled:opacity-40`} aria-disabled={at >= sides.length - 1}
            onClick={() => setAt((n) => Math.min(sides.length - 1, n + 1))}>{text('nextCardLabel')}</button>
        </div>
      )}
      {/* Which card is in view, read out as it changes (the dots are decoration). */}
      {sides.length > 1 && <p className="sr-only" aria-live="polite">{`${heading(side.key)}, ${at + 1} / ${sides.length}`}</p>}
      <pre ref={textRef} hidden className="whitespace-pre-wrap font-sans text-sm text-[var(--color-text-secondary)]">{all}</pre>
      <button type="button" className={secondaryButton} onClick={copy}>{text('copyLabel')}</button>
      <p className="text-sm text-center text-[var(--color-text-tertiary)]" role="status" aria-live="polite">{status}</p>
      {/* The way on once the last card has been seen; a quiet link before that, never a lock. */}
      {at >= sides.length - 1
        ? <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: [...done.current] })}>{text('next')}</button>
        : <div className="flex justify-center">{next}</div>}
    </div>
  );
}
