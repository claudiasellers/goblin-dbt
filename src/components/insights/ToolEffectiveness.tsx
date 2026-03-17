import { Link } from 'react-router-dom';
import { tools as toolsData } from '../../data/tools';
import type { ToolEffectivenessData } from '../../services/neo4j';

interface Props {
  data: ToolEffectivenessData | null;
  totalCheckIns?: number;
  delay?: number;
}

export function ToolEffectiveness({ data, totalCheckIns, delay = 0 }: Props) {
  const cardClass =
    'rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6';

  if (!data) {
    return (
      <div
        className={cardClass}
        style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: 'var(--color-text-muted)' }}
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            What's working
          </p>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {(totalCheckIns ?? 0) < 1
            ? "After you try some tools, this will track which ones actually help — so you build a personal toolkit based on what works for you."
            : "Try rating how tools work for you after using them. That feedback helps this card learn what's actually landing."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cardClass}
      style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--color-quadrant-low-pleasant)' }}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          What's working
        </p>
      </div>
      <div className="space-y-2.5">
        {data.tools.map((t) => {
          const tool = toolsData.find((td) => td.id === t.toolId);
          if (!tool) return null;
          return (
            <Link
              key={t.toolId}
              to={`/tool/${t.toolId}`}
              className="flex items-center gap-3 group"
            >
              <span className="text-base flex-shrink-0">{tool.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                    {tool.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t.helpedPct}% helpful
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                    style={{ width: `${t.helpedPct}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
