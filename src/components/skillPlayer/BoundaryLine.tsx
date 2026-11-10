import { useEffect, useRef, useState } from 'react';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The boundary line card (docs/design/fast.md; plan C3b `boundaryLine`, IE-owned): the line the person picked or
 * wrote, on the keepsake paper, with Copy. Never locked: the line is usable at any band, including flooded (PRD
 * IE-05; removing Recover's `boundaryLocked` is IE-B4's). Reports `copied` when the copy went through.
 *
 * Props (EMBED_PROPS): `field`, the field whose picks make the card (labels, own words last); `shape` `line` (one
 * line, copyable) or `list` (e.g. the values to keep, not a sentence, no Copy); the words as resolved copy:
 * `copyLabel`, `copiedLabel`, `selectedLabel` (said when there's no clipboard and the line is selected instead),
 * `next`.
 */
export function BoundaryLine({ props, picked, onShown, onDone }: EmbedProps) {
  const field = typeof props.field === 'string' ? props.field : '';
  const copyable = props.shape !== 'list';
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const lines = picked?.[field] ?? [];
  // A copyable card is one line (one single-pick field); a list is never joined into one sentence.
  const line = lines.join(' ');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const lineRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (lines.length) onShown(); }, [lines.length, onShown]);
  const next = <button type="button" className={copyable && lines.length ? linkButton : primaryButton}
    onClick={() => onDone?.({ ids: copied ? ['copied'] : [] })}>{text('next')}</button>;
  // Nothing picked to show (content drift): never strand the person on a whole-screen embed.
  if (!lines.length) return <div className="flex justify-center">{next}</div>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setStatus(text('copiedLabel'));
    } catch {
      // No clipboard (an old browser, a denied permission): select the line so it can be copied by hand.
      const el = lineRef.current;
      const sel = window.getSelection();
      if (el && sel) { const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r); }
      setStatus(text('selectedLabel'));
    }
  };

  return (
    <div className="space-y-5" data-testid="boundary-line">
      {/* Focus stays on the step's title (the player's Prompt); the paper doesn't take it. */}
      <PaperCard label={lines.join(', ')}>
        {copyable
          ? <p ref={lineRef} className={paperLine}>{line}</p>
          : <ul className="space-y-2">{lines.map((l, i) => <li key={i} className={paperLine}>{l}</li>)}</ul>}
      </PaperCard>
      <div className="space-y-2">
        {copyable && (
          <button type="button" className={primaryButton} onClick={copy}>
            {copied ? text('copiedLabel') : text('copyLabel')}
          </button>
        )}
        <p role="status" className={status && !copied ? 'text-center text-sm text-[var(--color-text-secondary)]' : 'sr-only'}>{status}</p>
        <div className="flex justify-center">{next}</div>
      </div>
    </div>
  );
}
