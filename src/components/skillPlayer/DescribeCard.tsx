import { useEffect } from 'react';
import { PaperCard, paperLine } from '../shared/PaperCard';
import { linkButton, primaryButton } from '../tools/oppositeAction/styles';
import { describeLines } from '../../lib/describeCard';
import type { EmbedProps } from './embeds';

/**
 * The describe card (MF-03 Unpack a judgment, MF-owned; docs/design/unpack-a-judgment.md): what the person found
 * under the judgment, put together in their own picks on the keepsake paper. One line per thing that happened and
 * per cost, one line for the feelings (`feelLead`), one per thing that mattered (`wantLead`). No Copy: it isn't a
 * message. Reports `read`.
 *
 * Props: `happened`, `cost`, `feel`, `want` (fields, each optional); `feelLead`, `wantLead`, `next`, and `empty`
 * (the way on when nothing was picked, never a stranded screen).
 */
export function DescribeCard({ props, picked, onShown, onDone }: EmbedProps) {
  const text = (k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');
  const of = (k: string) => (typeof props[k] === 'string' ? picked?.[props[k] as string] : undefined);
  const lines = describeLines(
    { happened: of('happened'), cost: of('cost'), feel: of('feel'), want: of('want') },
    { feelLead: text('feelLead'), wantLead: text('wantLead') },
  );
  useEffect(() => { if (lines.length) onShown(); }, [lines.length, onShown]);
  if (!lines.length) {
    return (
      <div className="flex justify-center">
        <button type="button" className={linkButton} onClick={() => onDone?.({ ids: [] })}>{text('empty') || text('next')}</button>
      </div>
    );
  }
  return (
    <div className="space-y-5" data-testid="describe-card">
      <PaperCard label={lines.join(' ')}>
        <ul className="space-y-2">{lines.map((l, i) => <li key={i} className={paperLine}>{l}</li>)}</ul>
      </PaperCard>
      <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: ['read'] })}>{text('next')}</button>
    </div>
  );
}
