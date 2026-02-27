import { EmotionalBriefing } from './EmotionalBriefing';
import { CurrentState } from './CurrentState';
import { StatsBar } from './StatsBar';
import { QuickCheckin } from './QuickCheckin';
import { RecommendedTools } from './RecommendedTools';
import { RecentCheckins } from './RecentCheckins';

export function DashboardStatsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <EmotionalBriefing />
      <CurrentState />
      <StatsBar />
      <QuickCheckin />
      <RecommendedTools />
      <RecentCheckins />
    </div>
  );
}
