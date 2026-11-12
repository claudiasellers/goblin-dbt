import { useEffect, useRef, useState } from 'react';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { choiceButton, linkButton, primaryButton } from '../tools/oppositeAction/styles';

const secondaryButton = `${choiceButton} text-center`;
import { composeMessage, dropSorry, messagesHref, overExplains, sorryCount } from '../../lib/messageComposer';
import type { EmbedProps } from './embeds';

/**
 * The message card (plan C3b `messageComposer`, IE-owned; docs/design/say-no.md): the run's picks as one message on
 * the keepsake paper, in the skill's `parts` order (One message) or a fixed one (`opener`, `field`, `reason`, `alt`;
 * the optional ones drop out), with the FAST
 * strip under it (DBT IE Handout 7): an apology found in it gets a line and *take the sorry out*, a long reason gets
 * a line. The line to repeat if they push is the main field on its own. Copy, and Open messages where the device has
 * one: the app never sends on the person's behalf, and nothing is locked (any band). Reports `copied`, `opened` and
 * `dropped_sorry` (what was done, never the words).
 */
export function MessageComposer({ props, picked, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const of = (k: string) => (typeof props[k] === 'string' ? picked?.[props[k] as string] : undefined);
  // The parts in the order they're said: the skill's `parts` (One message), else opener, the line, reason, something else.
  const order = Array.isArray(props.parts) ? (props.parts as unknown[]).filter((x): x is string => typeof x === 'string') : null;
  const composed = composeMessage(order ? order.map((f) => picked?.[f]) : [of('opener'), of('field'), of('reason'), of('alt')]);
  const [dropped, setDropped] = useState(false);
  const message = dropped ? dropSorry(composed) : composed;
  // The line to repeat follows the message: once the sorry is out, it's out of both.
  const rawLine = composeMessage([of('field')]);
  const line = dropped ? dropSorry(rawLine) : rawLine;
  const sorry = sorryCount(message);
  // *Take the sorry out* only when it can take one out whole and leave a message (never a button that does nothing).
  const cleaned = dropSorry(composed);
  const canDrop = !dropped && !!cleaned && cleaned !== composed.trim();
  const longReason = overExplains(of('reason'));
  const done = useRef(new Set<string>());
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const lineRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (composed) onShown(); }, [composed, onShown]);

  const next = (
    <button type="button" className={composed ? linkButton : primaryButton}
      onClick={() => onDone?.({ ids: [...done.current] })}>{text('next')}</button>
  );
  // Nothing picked to show (content drift): never strand the person on a whole-screen embed.
  if (!composed) return <div className="flex justify-center">{next}</div>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      done.current.add('copied');
      setCopied(true);
      setStatus(text('copiedLabel'));
    } catch {
      // No clipboard: select the message so it can be copied by hand.
      const el = lineRef.current;
      const sel = window.getSelection();
      if (el && sel) { const r = document.createRange(); r.selectNodeContents(el); sel.removeAllRanges(); sel.addRange(r); }
      setStatus(text('selectedLabel'));
    }
  };

  return (
    <div className="space-y-5" data-testid="message-composer">
      <PaperCard label={message}>
        <p ref={lineRef} className={paperLine}>{message}</p>
      </PaperCard>
      {(sorry > 0 || longReason) && (
        <div className="rounded-xl border border-[var(--color-border)] px-4 py-3 space-y-2" data-testid="fast-strip">
          {sorry > 0 && text('sorryLine') && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">{text('sorryLine')}</p>
              {text('dropSorry') && canDrop && (
                <button type="button" className={secondaryButton}
                  onClick={() => { done.current.add('dropped_sorry'); setDropped(true); setCopied(false); setStatus(''); }}>
                  {text('dropSorry')}
                </button>
              )}
            </>
          )}
          {longReason && text('explainLine') && <p className="text-sm text-[var(--color-text-secondary)]">{text('explainLine')}</p>}
        </div>
      )}
      {line && line !== message && text('repeatLabel') && (
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-text-secondary)]">{text('repeatLabel')}</p>
          <p className="font-medium text-[var(--color-text-primary)]">{line}</p>
        </div>
      )}
      <div className="space-y-2">
        <button type="button" className={primaryButton} onClick={copy}>
          {copied ? text('copiedLabel') : text('copyLabel')}
        </button>
        {text('openLabel') && (
          <a href={messagesHref(message)} className={`${secondaryButton} block`}
            onClick={() => { done.current.add('opened'); }}>{text('openLabel')}</a>
        )}
        <p role="status" className={status && !copied ? 'text-center text-sm text-[var(--color-text-secondary)]' : 'sr-only'}>{status}</p>
        <div className="flex justify-center">{next}</div>
      </div>
    </div>
  );
}
