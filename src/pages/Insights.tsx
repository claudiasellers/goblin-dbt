import { Suspense, lazy, useEffect, useState, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getInsightsData, type InsightsPayload } from '../services/neo4j';
import { InsightSkeleton } from '../components/insights/InsightSkeleton';
import { FormulationCard } from '../components/insights/FormulationCard';
import { ProactiveAlert } from '../components/insights/ProactiveAlert';
import { GrowthEvidence } from '../components/insights/GrowthEvidence';
import { SomaticCorrelation } from '../components/insights/SomaticCorrelation';
import { ToolEffectiveness } from '../components/insights/ToolEffectiveness';
import { TimeFilter } from '../components/history/TimeFilter';
import type { TimeRange } from '../components/history/useFilteredCheckIns';

// Reflect's parts section loads only when the server sent parts (parts on): nobody else downloads it.
const LazyPartsReflect = lazy(() => import('../components/insights/PartsReflect').then((m) => ({ default: m.PartsReflect })));
function PartsReflect(p: ComponentProps<typeof LazyPartsReflect>) { return <Suspense fallback={null}><LazyPartsReflect {...p} /></Suspense>; }

function InsightPlaceholder({ icon, title, description, delay = 0 }: {
  icon: string;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <div
      className="rounded-xl bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border-subtle)] p-6 text-center opacity-70"
      style={{ animation: `fadeIn 0.5s var(--ease-default) ${delay}s both` }}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-[var(--color-text-secondary)] max-w-xs mx-auto">{description}</p>
    </div>
  );
}

export function Insights() {
  const { user } = useAuth();
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getInsightsData(timeRange)
      .then(setData)
      .catch((err) => {
        console.error('[Insights] error fetching data:', err);
      })
      .finally(() => setLoading(false));
  }, [user, timeRange]);

  if (loading) return <InsightSkeleton />;

  if (!data) {
    return (
      <div className="space-y-4 text-center py-8">
        <p className="text-[var(--color-text-secondary)]">
          Something went wrong loading insights.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium lift-primary"
        >
          Check in now
        </Link>
      </div>
    );
  }

  let delayIndex = 0;
  const nextDelay = () => (delayIndex++) * 0.07;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Insights</h2>
        <TimeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {data.formulation ? (
        <FormulationCard formulation={data.formulation} delay={nextDelay()} />
      ) : (
        <InsightPlaceholder
          icon="🧠"
          title="Your pattern"
          description="We're still building a picture of your dominant nervous system pattern. Keep checking in — this will fill in soon."
          delay={nextDelay()}
        />
      )}

      {data.proactiveAlert ? (
        <ProactiveAlert alert={data.proactiveAlert} delay={nextDelay()} />
      ) : (
        <InsightPlaceholder
          icon="🔔"
          title="Heads up"
          description="When we spot a pattern that tends to escalate, we'll flag it here with a tool to try before it builds."
          delay={nextDelay()}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.growthEvidence ? (
          <GrowthEvidence data={data.growthEvidence} delay={nextDelay()} />
        ) : (
          <InsightPlaceholder
            icon="📈"
            title="Your growth"
            description="We need a few more check-ins across different days to start tracking how your skills are developing."
            delay={nextDelay()}
          />
        )}

        {data.somaticCorrelation ? (
          <SomaticCorrelation data={data.somaticCorrelation} totalCheckIns={data.totalCheckIns} delay={nextDelay()} />
        ) : (
          <InsightPlaceholder
            icon="🫀"
            title="Body signals"
            description="Select body regions during check-ins and we'll map which areas light up for different states."
            delay={nextDelay()}
          />
        )}

        {data.toolEffectiveness ? (
          <ToolEffectiveness data={data.toolEffectiveness} delay={nextDelay()} />
        ) : (
          <InsightPlaceholder
            icon="🛠️"
            title="What's working"
            description="Try a tool and rate how it went — we'll track which ones help most."
            delay={nextDelay()}
          />
        )}
      </div>

      {/* Parts on only, after Reflect's own sections; renders nothing unless a part has a line and the copy ships. */}
      {data.parts && data.parts.length > 0 && <PartsReflect parts={data.parts} delay={nextDelay()} />}
    </div>
  );
}
