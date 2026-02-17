import { EmotionalBriefing } from '../components/dashboard/EmotionalBriefing';
import { CurrentState } from '../components/dashboard/CurrentState';
import { StatsBar } from '../components/dashboard/StatsBar';
import { QuickCheckin } from '../components/dashboard/QuickCheckin';
import { RecommendedTools } from '../components/dashboard/RecommendedTools';
import { RecentCheckins } from '../components/dashboard/RecentCheckins';

export function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
      {/* Row 1: Briefing (2col) + Current State (1col) + Stats (1col) */}
      <div className="lg:col-span-2">
        <EmotionalBriefing />
      </div>
      <div className="lg:col-span-1">
        <CurrentState />
      </div>
      <div className="lg:col-span-1">
        <StatsBar />
      </div>

      {/* Row 2: Quick Check-in (1col) + Recommended Tools (1col) + Recent Check-ins (2col) */}
      <div className="lg:col-span-1">
        <QuickCheckin />
      </div>
      <div className="lg:col-span-1">
        <RecommendedTools />
      </div>
      <div className="lg:col-span-2">
        <RecentCheckins />
      </div>
    </div>
  );
}
