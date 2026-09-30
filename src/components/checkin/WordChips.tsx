import { useEffect, useRef } from 'react';
import { useRelatedWords } from '../../hooks/useRelatedWords';
import { getEmotionByName } from '../../data/emotions';
import { QUADRANT_ABBR } from '../../lib/feelingSquare';

/** A word chip in its own quadrant's colour when picked. */
export function WordChip({ name, on, onClick, small = false }: { name: string; on: boolean; onClick: () => void; small?: boolean }) {
  const q = getEmotionByName(name)?.quadrant;
  const abbr = q ? QUADRANT_ABBR[q] : 'hu';
  return (
    <button
      type="button"
      aria-pressed={on}
      className={`den-chip${small ? ' den-chip--small' : ''}`}
      style={{ ['--chip-on' as string]: `var(--color-q-${abbr}-fill)` }}
      onClick={onClick}
    >
      {small && !on && <span className="qd" style={{ background: `var(--color-q-${abbr}-fill)` }} aria-hidden="true" />}
      {name}
    </button>
  );
}

/** Words the graph relates to the last pick, as small "+" chips. */
export function RelatedRow({ to, exclude, onAdd }: { to: string | undefined; exclude: string[]; onAdd: (name: string) => void }) {
  const related = useRelatedWords(to, exclude);
  const ref = useRef<HTMLDivElement>(null);
  const key = related.join('|');
  // When new related words arrive, bring them into view (above the sticky action dock).
  useEffect(() => {
    if (!key || !ref.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ref.current.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [key]);
  if (!to || related.length === 0) return null;
  return (
    <div ref={ref} className="mt-4 scroll-mb-[120px]">
      <p className="m-0 mb-2 font-serif italic text-[16px] text-[var(--color-text-secondary)]">Often alongside {to.toLowerCase()}</p>
      <div className="flex flex-wrap gap-2">
        {related.map((name) => {
          const q = getEmotionByName(name)?.quadrant;
          const abbr = q ? QUADRANT_ABBR[q] : 'hu';
          return (
            <button key={name} type="button" className="den-chip den-chip--small" onClick={() => onAdd(name)}>
              <span className="qd" style={{ background: `var(--color-q-${abbr}-fill)` }} aria-hidden="true" />
              {name}
              <span aria-hidden="true" className="text-[var(--color-text-tertiary)]">+</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
