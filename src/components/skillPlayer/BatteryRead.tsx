import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { primaryButton } from '../tools/oppositeAction/styles';
import type { EmbedProps } from './embeds';

/**
 * Running low's readout (ER-07, docs/design/running-low.md; plan C3b `batteryRead`, ER-owned). The day's tank as one
 * picture: a cell per row (`fields`, in order, named by the copy `names`, split on " · "). An answered row is a plain
 * cell (it claims nothing about that row: another row may be loud too), a skipped row a dashed outline, and the
 * loudest row (`low`) drains to a sliver as the screen opens, outlined in the warning colour. No numbers, no
 * percentages and no charge level: the picture says which row, never how much. The step's title is the readout,
 * so the whole picture is hidden from screen readers. A row the person left out in Me (`hidden` names the profile slice,
 * Running low's `pleaseRows`) gets no cell: it was never asked.
 *
 * Output: `read`.
 */

const text = (props: Record<string, unknown>, k: string) => (typeof props[k] === 'string' ? (props[k] as string) : '');

export function BatteryRead({ props, answerIds = {}, profile, onShown, onDone }: EmbedProps) {
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
  const slice = typeof props.hidden === 'string' ? profile?.[props.hidden] : null;
  const hidden = new Set(Array.isArray(slice) ? slice.filter((x): x is string => typeof x === 'string' && x !== low) : []);
  const cells = fields.map((f, i) => ({
    id: f,
    name: names[i] ?? '',
    state: f === low ? 'low' : (answerIds[f]?.length ?? 0) > 0 ? 'answered' : 'skipped',
  })).filter((c) => !hidden.has(c.id));
  return (
    <section className="space-y-5" data-testid="battery-read">
      <div aria-hidden="true" className="space-y-5">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-1 gap-1.5 rounded-2xl border-2 border-[var(--color-border)] p-1.5">
          {cells.map((c) => (
            <div
              key={c.id}
              data-cell={c.state}
              className={`relative h-20 flex-1 overflow-hidden rounded-lg border-2 ${
                c.state === 'skipped'
                  ? 'border-dashed border-[var(--color-border)]'
                  : c.state === 'low'
                    ? 'border-[var(--color-warning)] bg-[var(--color-bg-card)]'
                    : 'border-[var(--color-fam-er-lip)] bg-[var(--color-fam-er)]'
              }`}
            >
              {c.state === 'low' && (
                <motion.div
                  className="absolute inset-x-0 bottom-0 bg-[var(--color-warning)]"
                  initial={{ height: '100%' }}
                  animate={{ height: '18%' }}
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
      </div>
      {text(props, 'line') && <p className="text-base leading-snug text-[var(--color-text-secondary)]">{text(props, 'line')}</p>}
      <button type="button" className={primaryButton} onClick={() => onDone?.({ ids: ['read'] })}>{text(props, 'next')}</button>
    </section>
  );
}
