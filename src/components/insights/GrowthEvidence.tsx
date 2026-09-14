import type { GrowthEvidenceInsight } from '../../services/neo4j';

interface Props {
  data: GrowthEvidenceInsight;
  delay?: number;
}

const INSIGHT_META: Record<string, { label: string; icon: string }> = {
  'emotion-vocabulary': { label: 'Emotions named', icon: 'label' },
  'emotion-family-breadth': { label: 'Emotion families', icon: 'family' },
  'catching-earlier': { label: 'Avg intensity', icon: 'trending_down' },
  'pattern-diversity': { label: 'Patterns noticed', icon: 'hub' },
  'sensation-richness': { label: 'Body sensations', icon: 'sensors' },
  'body-awareness': { label: 'Body regions', icon: 'accessibility' },
  'tool-follow-through': { label: 'Follow-through', icon: 'loop' },
  'tool-repertoire': { label: 'Tools tried', icon: 'build' },
  'positive-outcomes': { label: 'Tools helping', icon: 'check_circle' },
};

function ComparisonBar({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
  const max = Math.max(current, previous, 1);
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">Before</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{previous}{suffix}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${(previous / max) * 100}%`,
              background: 'var(--color-text-muted)',
              opacity: 0.4,
            }}
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--color-text-muted)]">Now</span>
          <span className="text-[10px] font-medium text-[var(--color-accent)]">{current}{suffix}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-accent-fill)] transition-all duration-700"
            style={{ width: `${(current / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RatioDots({ numerator, denominator }: { numerator: number; denominator: number }) {
  const dots = Array.from({ length: denominator }, (_, i) => i < numerator);
  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {dots.map((filled, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full transition-all duration-500"
          style={{
            background: filled ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
      <span className="text-xs text-[var(--color-text-muted)] ml-1">
        {numerator}/{denominator}
      </span>
    </div>
  );
}

function PercentRing({ value }: { value: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex items-center gap-3 mt-2">
      <svg width="40" height="40" className="flex-shrink-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-bg-elevated)" strokeWidth="4" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke="var(--color-accent)" strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="text-lg font-semibold text-[var(--color-accent)]">{value}%</span>
    </div>
  );
}

function InsightVisual({ insight }: { insight: GrowthEvidenceInsight['insights'][0] }) {
  const { key, data } = insight;

  if (key === 'tool-follow-through' && data.numerator != null && data.denominator != null) {
    return <RatioDots numerator={data.numerator} denominator={Math.min(data.denominator, 20)} />;
  }

  if (key === 'positive-outcomes' && data.current != null) {
    return <PercentRing value={data.current} />;
  }

  if (key === 'catching-earlier' && data.current != null && data.previous != null) {
    return <ComparisonBar current={data.current} previous={data.previous} suffix="%" />;
  }

  if (data.current != null && data.previous != null) {
    return <ComparisonBar current={data.current} previous={data.previous} />;
  }

  return null;
}

export function GrowthEvidence({ data, delay = 0 }: Props) {
  return (
    <div
      className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6"
      style={{
        animation: `fadeIn 0.5s var(--ease-default) ${delay}s both`,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--color-accent)' }}
        />
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
          Growth evidence
        </p>
      </div>
      <div className="space-y-4">
        {data.insights.map((insight, i) => {
          const meta = INSIGHT_META[insight.key];
          return (
            <div
              key={insight.key}
              className="pb-4 last:pb-0 last:border-0"
              style={{
                borderBottom: i < data.insights.length - 1 ? '1px solid var(--color-border-subtle)' : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  {meta?.label || insight.key}
                </p>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                {insight.text}
              </p>
              <InsightVisual insight={insight} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
