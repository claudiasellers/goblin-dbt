import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { PartsContent } from '../../data/partsContentTypes';
import type { MeItem } from '../../services/profile';
import { meetAPartLink, partCardRows, sortPartItems, type PartsOfMePromptId } from '../../lib/partsOfMe';
import { PartFigure } from '../parts/PartFigure';

/**
 * Me → Parts of me (docs/design/parts.md, "The part card"): read-only cards for the parts a person
 * has kept, no stats yet. Rendered by MeSection only with parts on and all its copy signed off.
 * Nothing here writes a part; set-aside parts use Me's own set-aside row (`renderSetAside`).
 */
export function PartsOfMe({ items, content, copy, renderSetAside }: {
  items: MeItem[];
  content: PartsContent;
  copy: Record<PartsOfMePromptId, string>;
  renderSetAside: (item: MeItem) => ReactNode;
}) {
  const parts = sortPartItems(items.filter((i) => i.part));
  const live = parts.filter((i) => i.meta.status !== 'set_aside');
  const setAside = parts.filter((i) => i.meta.status === 'set_aside');
  const getToKnow = meetAPartLink();

  return (
    <div className="mt-1 space-y-3">
      <Link to={getToKnow.pathname} state={getToKnow.state}
        className="inline-flex items-center min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
        {copy.me_get_to_know}
      </Link>
      {live.length > 0 && (
        <ul className="space-y-3">
          {live.map((i) => <PartCard key={i.meta.id} item={i} content={content} copy={copy} />)}
        </ul>
      )}
      {setAside.length > 0 && <ul>{setAside.map(renderSetAside)}</ul>}
    </div>
  );
}

function PartCard({ item, content, copy }: { item: MeItem; content: PartsContent; copy: Record<PartsOfMePromptId, string> }) {
  const part = item.part!;
  const rows = partCardRows(part, content);
  const visit = meetAPartLink(item.meta.id);
  const row = (label: string, value: ReactNode) => (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="text-[var(--color-text-secondary)]">{value}</dd>
    </div>
  );
  return (
    <li className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <PartFigure shapeSig={part.shapeSig} size={64} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {/* The person's own name for it, in the serif; unnamed, the kind's label ("A part"). */}
            <h4 className={part.name
              ? 'font-serif text-xl leading-tight text-[var(--color-text-primary)] break-words'
              : 'text-sm font-medium text-[var(--color-text-primary)]'}>
              {part.name ?? item.title}
            </h4>
            {item.meta.status === 'resting' && (
              <span className="text-xs text-[var(--color-text-tertiary)]">{copy.card_resting}</span>
            )}
          </div>
          <dl className="mt-1 space-y-0.5 text-sm">
            {rows.where.length > 0 && row(copy.card_where, rows.where.join(', '))}
            {rows.job && ('own' in rows.job
              ? row(copy.card_job_own, <span className="font-serif">{rows.job.own}</span>)
              : row(copy.card_job, rows.job.labels.join(', ')))}
            {rows.fears.length > 0 && row(copy.card_fear, rows.fears.join(', '))}
            {rows.rather.length > 0 && row(copy.card_rather, rows.rather.join(', '))}
          </dl>
        </div>
      </div>
      <Link to={visit.pathname} state={visit.state}
        className="mt-2 inline-flex items-center min-h-11 text-sm text-[var(--color-text-secondary)] underline underline-offset-2">
        {copy.card_visit}
      </Link>
    </li>
  );
}
