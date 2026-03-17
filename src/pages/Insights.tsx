import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getInsightsData, type InsightsPayload } from '../services/neo4j';
import { InsightSkeleton } from '../components/insights/InsightSkeleton';
import { FormulationCard } from '../components/insights/FormulationCard';
import { ProactiveAlert } from '../components/insights/ProactiveAlert';
import { GrowthEvidence } from '../components/insights/GrowthEvidence';
import { SomaticCorrelation } from '../components/insights/SomaticCorrelation';
import { ToolEffectiveness } from '../components/insights/ToolEffectiveness';

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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getInsightsData()
      .then((result) => {
        console.log('[Insights] data received:', JSON.stringify(result, null, 2));
        setData(result);
      })
      .catch((err) => {
        console.error('[Insights] error fetching data:', err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <InsightSkeleton />;
  if (!user || !data) return <InsightEmptyState />;

  let delayIndex = 0;
  const nextDelay = () => (delayIndex++) * 0.07;

  return (
    <div className="space-y-4">
      <FormulationCard formulation={data.formulation} totalCheckIns={data.totalCheckIns} delay={nextDelay()} />

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
        <GrowthEvidence data={data.growthEvidence} totalCheckIns={data.totalCheckIns} delay={nextDelay()} />
        <SomaticCorrelation data={data.somaticCorrelation} totalCheckIns={data.totalCheckIns} delay={nextDelay()} />
        <ToolEffectiveness data={data.toolEffectiveness} totalCheckIns={data.totalCheckIns} delay={nextDelay()} />
      </div>
    </div>
  );
}
