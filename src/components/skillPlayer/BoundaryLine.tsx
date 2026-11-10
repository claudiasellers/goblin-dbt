import { useEffect, useRef, useState } from 'react';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * The boundary line card (docs/design/fast.md; plan C3b `boundaryLine`, IE-owned): the line the person picked or
 * wrote, on the keepsake paper, with Copy. Never locked: the line is usable at any band, including flooded (PRD
 * IE-05, removing Recover's `boundaryLocked` is IE-B4's). Reports `copied` when the copy went through.
 *
 * Props (from the skill): `from`, the fields whose picks make the line (their labels, own words last, joined);
 * `copyable` (false for a list that isn't a sentence, e.g. the values to keep); `labels` {copy, copied, selected (said when there's no clipboard and the line is selected instead), next}.
 */
export function BoundaryLine({ props, picked, onShown, onDone }: EmbedProps) {
  const from = Array.isArray(props.from) ? (props.from as string[]) : [];
  const labels = (props.labels ?? {}) as { copy?: string; copied?: string; selected?: string; next?: string };
  const copyable = props.copyable !== false;
  const lines = from.flatMap((f) => picked?.[f] ?? []);
  // A copyable card is one line (the content gives it one single-pick field); a list is never joined into one.
  const text = copyable ? lines.join(' ') : lines.join('\n');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const lineRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (text) onShown(); }, [text, onShown]);
  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setStatus(labels.copied ?? '');
    } catch {
      // No clipboard (an old browser, a denied permission): select the line so it can be copied by hand.
      const el = lineRef.current;
      const sel = window.getSelection();
      if (el && sel) { const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r); }
      setStatus(labels.selected ?? '');
    }
  };

  return (
    <div className="space-y-5" data-testid="boundary-line">
      {/* Focus stays on the step's title (the player's Prompt); the paper doesn't take it. */}
      <PaperCard label={lines.join(', ')}>
        {lines.length > 1 && !copyable
          ? <ul className="space-y-2">{lines.map((l, i) => <li key={i} className={paperLine}>{l}</li>)}</ul>
          : <p ref={lineRef} className={paperLine}>{text}</p>}
      </PaperCard>
      <div className="space-y-2">
        {copyable && (
          <button type="button" className={primaryButton} onClick={copy}>
            {copied ? labels.copied : labels.copy}
          </button>
        )}
        <p role="status" className={status && !copied ? 'text-center text-sm text-[var(--color-text-secondary)]' : 'sr-only'}>{status}</p>
        <div className="flex justify-center">
          <button type="button" className={copyable ? linkButton : primaryButton}
            onClick={() => onDone?.({ ids: copied ? ['copied'] : [] })}>
            {labels.next}
          </button>
        </div>
      </div>
    </div>
  );
}
