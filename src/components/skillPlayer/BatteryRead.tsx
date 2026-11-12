import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * Running low's readout (ER-07, docs/design/running-low.md; plan C3b `batteryRead`, ER-owned). The day's tank as one
 * picture: a cell per row (`fields`, in order, named by the copy `names`, split on " · "). A row the person answered
 * is a full cell, a skipped row an outline, and the loudest row (`low`) drains to a sliver as the screen opens. No
 * numbers, no percentages and no charge level: the cells say which, never how much. The step's title is the readout.
 *
 * Output: `read`.
 */

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

export function BatteryRead({ props, answerIds = {}, onShown, onDone }: EmbedProps) {
  const shown = useRef(false);
  useEffect(() => {
    if (!shown.current) {
      shown.current = true;
      onShown();
    }
  }, [onShown]);
  const reduce = useReducedMotion();
  const fields = Array.isArray(props.fields) ? (props.fields as string[]) : [];
  const names = text(props, 'names').split(' · ');
  const low = text(props, 'low');
  const cells = fields.map((f, i) => ({
    id: f,
    name: names[i] ?? '',
    state: f === low ? 'low' : (answerIds[f]?.length ?? 0) > 0 ? 'full' : 'skipped',
  }));
  return (
    <section className="space-y-5" data-testid="battery-read">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <div className="flex flex-1 gap-1.5 rounded-2xl border-2 border-[var(--color-border)] p-1.5">
          {cells.map((c) => (
            <div
              key={c.id}
              data-cell={c.state}
              className={`relative h-20 flex-1 overflow-hidden rounded-lg ${
                c.state === 'skipped' ? 'border-2 border-dashed border-[var(--color-border)]' : 'bg-[var(--color-bg-elevated)]'
              }`}
            >
              {c.state !== 'skipped' && (
                <motion.div
                  className={`absolute inset-x-0 bottom-0 ${c.state === 'low' ? 'bg-[var(--color-warning-border)]' : 'bg-[var(--color-fam-er)]'}`}
                  initial={{ height: '100%' }}
                  animate={{ height: c.state === 'low' ? '18%' : '100%' }}
                  transition={reduce ? { duration: 0 } : { duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="h-8 w-2 rounded-r-md bg-[var(--color-border)]" />
      </div>
      <ul className="flex gap-1.5 pr-3.5 text-center text-sm text-[var(--color-text-secondary)]">
        {cells.map((c) => (
          <li key={c.id} className={`flex-1 leading-tight ${c.state === 'low' ? 'font-semibold text-[var(--color-text-primary)]' : ''}`}>
            {c.name}
          </li>
        ))}
      </ul>
      {text(props, 'line') && <p className="text-base leading-snug text-[var(--color-text-secondary)]">{text(props, 'line')}</p>}
      <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: ['read'] })}>{text(props, 'next')}</button>
    </section>
  );
}
