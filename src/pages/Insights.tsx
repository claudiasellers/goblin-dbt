import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getInsightsData, type InsightsPayload } from '../services/neo4j';
import { InsightSkeleton } from '../components/insights/InsightSkeleton';
import { InsightEmptyState } from '../components/insights/InsightEmptyState';
import { FormulationCard } from '../components/insights/FormulationCard';
import { ProactiveAlert } from '../components/insights/ProactiveAlert';
import { GrowthEvidence } from '../components/insights/GrowthEvidence';
import { SomaticCorrelation } from '../components/insights/SomaticCorrelation';
import { ToolEffectiveness } from '../components/insights/ToolEffectiveness';

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

  // Show empty state if no meaningful data
  const hasContent = data && (
    data.formulation ||
    data.proactiveAlert ||
    data.growthEvidence ||
    data.somaticCorrelation ||
    data.toolEffectiveness
  );

  if (!hasContent) return <InsightEmptyState />;

  let delayIndex = 0;
  const nextDelay = () => (delayIndex++) * 0.07;

  return (
    <div className="space-y-4">
      {data.formulation && (
        <FormulationCard formulation={data.formulation} delay={nextDelay()} />
      )}

      {data.proactiveAlert && (
        <ProactiveAlert alert={data.proactiveAlert} delay={nextDelay()} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.growthEvidence && (
          <GrowthEvidence data={data.growthEvidence} delay={nextDelay()} />
        )}

        {data.somaticCorrelation && (
          <SomaticCorrelation data={data.somaticCorrelation} totalCheckIns={data.totalCheckIns} delay={nextDelay()} />
        )}

        {data.toolEffectiveness && (
          <ToolEffectiveness data={data.toolEffectiveness} delay={nextDelay()} />
        )}
      </div>
    </div>
  );
}
