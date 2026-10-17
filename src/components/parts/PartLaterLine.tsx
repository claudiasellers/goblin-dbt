import { useRef, useState } from 'react';
import { linkButton } from '../tools/oppositeAction/styles';
import { useStepFocus } from './stepFocus';

/**
 * One quiet text button whose tap is the yes ("Want to get to know that part another time?"). `onLater`
 * queues the candidate; once it resolves the line becomes `done` ("It's in Me when you want it."). A
 * failure leaves the button to try again. Never in the way of the host's own next step.
 */
export function PartLaterLine({ ask, done, onLater }: { ask: string; done: string; onLater(): Promise<void> }) {
  const [state, setState] = useState<'ask' | 'sending' | 'done'>('ask');
  // The button stays focusable while it sends (aria-disabled, not disabled, so focus isn't dropped);
  // once it is replaced by the done line, focus moves to that line.
  const root = useRef<HTMLDivElement>(null);
  useStepFocus(root, state === 'done');
  const tap = () => {
    if (state !== 'ask') return;
    setState('sending');
    onLater().then(() => setState('done'), () => setState('ask'));
  };
  return (
    <div ref={root} className="text-center" aria-live="polite">
      {state === 'done'
        ? <p className="text-sm text-[var(--color-text-secondary)] focus:outline-none">{done}</p>
        : <button type="button" className={linkButton} aria-disabled={state === 'sending' || undefined} onClick={tap}>{ask}</button>}
    </div>
  );
}
