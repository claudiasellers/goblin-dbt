import { Link } from 'react-router-dom';
import { tools as toolsData } from '../../data/tools';
import type { ProactiveAlert as ProactiveAlertType } from '../../services/neo4j';

interface Props {
  alert: ProactiveAlertType;
  delay?: number;
}

export function ProactiveAlert({ alert, delay = 0 }: Props) {
  const tool = toolsData.find((t) => t.id === alert.suggestedTool);

  return (
    <div
      className="rounded-xl bg-[var(--color-q-lu-bg)] border border-[var(--color-q-lu-border)] p-5"
      style={{
        animation: `fadeIn 0.5s var(--ease-default) ${delay}s both`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
          style={{ background: 'var(--color-quadrant-low-unpleasant)' }}
        />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-q-lu-text)] mb-1.5">
            Heads up
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-3">
            {alert.narrative}
          </p>
          {alert.suggestedTool && (
            <Link
              to={`/tool/${alert.suggestedTool}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-q-lu-border)] text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-q-lu-border-hover)] transition-colors"
            >
              <span>{tool?.emoji || '🔧'}</span>
              <span>Try {tool?.name || alert.suggestedTool}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
