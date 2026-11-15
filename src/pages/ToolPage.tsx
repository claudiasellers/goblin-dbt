import { Suspense, lazy, useEffect, useState } from 'react';
import { useParams, Link, useLocation, Navigate } from 'react-router-dom';
import { getToolById, toolIdFromUrl, TOOL_URL_SLUGS } from '../data/tools';
import { ToolSessionProvider } from '../contexts/ToolSessionContext';
import { useToolGate } from '../hooks/useToolGate';
import { useOfficialNames } from '../hooks/useOfficialNames';
import { useStepBackSlot } from '../hooks/useStepBackSlot';
import { useUserProfile } from '../contexts/UserProfileContext';
import { ToolLoading } from '../components/tools/ToolLoading';
import { ToolNotFound } from '../components/tools/ToolNotFound';

// Import tool components
import { CoolDown } from './tools/CoolDown';
import { FiveSenses } from './tools/FiveSenses';
import { Pause } from './tools/Pause';
import { UrgeSurfing } from './tools/UrgeSurfing';
import { OppositeAction } from './tools/OppositeAction';
import { DearMan } from './tools/DearMan';
import { ProblemSolve } from './tools/ProblemSolve';
import { InvalidationRecovery } from './tools/InvalidationRecovery';
import { FindTheFeeling } from './tools/FindTheFeeling';
import { legacyLink, playerSkillFor } from '../lib/skillRuntime/playerTools';
import { isWiseMindCheck } from '../lib/wiseMindCheck';

// Meet a part, loaded on demand: its gate below (parts on, copy signed off) stays eager, so
// a parts-off person never fetches it. With parts on, the fetch starts with the gate's own.
const loadMeetAPart = () => import('./tools/MeetAPart');
const LazyMeetAPart = lazy(() => loadMeetAPart().then((m) => ({ default: m.MeetAPart })));
function MeetAPart() { return <Suspense fallback={<ToolLoading />}><LazyMeetAPart /></Suspense>; }
// Two pulls loads the same way, behind the same kind of gate (parts on, its copy signed off).
const loadTwoPulls = () => import('./tools/TwoPulls');
const LazyTwoPulls = lazy(() => loadTwoPulls().then((m) => ({ default: m.TwoPulls })));
function TwoPulls() { return <Suspense fallback={<ToolLoading />}><LazyTwoPulls /></Suspense>; }
// Wise mind (docs/design/wise-mind.md), its own chunk too: two SVG scenes and three practices nobody else needs.
const loadWiseMind = () => import('./tools/WiseMind');
const LazyWiseMind = lazy(() => loadWiseMind().then((m) => ({ default: m.WiseMind })));
/**
 * With parts on, a kept part and the step back's copy shipped, Wise mind runs its parts form (screen 2p,
 * src/hooks/useStepBackSlot.tsx); the page decides its form once, so it waits for that gate first. The check
 * (`isWiseMindCheck`) is the skill player, with no parts form.
 */
function WiseMind() {
  const { search } = useLocation();
  const [check] = useState(() => isWiseMindCheck(search));
  // The check (MF-04, docs/design/wise-mind-check.md) on the skill player: `?frame=check` or a reopened run.
  return check ? <Suspense fallback={<ToolLoading />}><LazySkillPlayer skillId="wise_mind_check" /></Suspense> : <WiseMindPractice />;
}
function WiseMindPractice() {
  const { pending, slot } = useStepBackSlot();
  if (pending) return <ToolLoading />;
  return <Suspense fallback={<ToolLoading />}><LazyWiseMind stepBack={slot} /></Suspense>;
}

// Cope Ahead (docs/design/cope-ahead.md), its own chunk: seven screens and a rehearsal nobody else needs.
const loadCopeAhead = () => import('./tools/CopeAhead');
const LazyCopeAhead = lazy(() => loadCopeAhead().then((m) => ({ default: m.CopeAhead })));
function CopeAhead() { return <Suspense fallback={<ToolLoading />}><LazyCopeAhead /></Suspense>; }

// Tools on the skill player (docs/design/skill-runtime.md; the switch is src/lib/skillRuntime/playerTools.ts):
// one chunk for every skill, ahead of the hand-built pages below.
const LazySkillPlayer = lazy(() => import('../components/skillPlayer/SkillPlayer').then((m) => ({ default: m.SkillPlayer })));
function PlayedTool({ skillId }: { skillId: string }) {
  return <Suspense fallback={<ToolLoading />}><LazySkillPlayer skillId={skillId} /></Suspense>;
}
// Keep your self-respect (FAST): two skills under one tool id, so its page picks which to play (docs/design/fast.md).
const LazyFast = lazy(() => import('./tools/Fast').then((m) => ({ default: m.Fast })));
function Fast() { return <Suspense fallback={<ToolLoading />}><LazyFast /></Suspense>; }
const LazySayNo = lazy(() => import('./tools/SayNo').then((m) => ({ default: m.SayNo })));
function SayNo() { return <Suspense fallback={<ToolLoading />}><LazySayNo /></Suspense>; }
const LazyGive = lazy(() => import('./tools/Give').then((m) => ({ default: m.Give })));
function Give() { return <Suspense fallback={<ToolLoading />}><LazyGive /></Suspense>; }
const LazyNoticeThem = lazy(() => import('./tools/NoticeThem').then((m) => ({ default: m.NoticeThem })));
const LazyRehearse = lazy(() => import('./tools/Rehearse').then((m) => ({ default: m.Rehearse })));
function NoticeThem() { return <Suspense fallback={<ToolLoading />}><LazyNoticeThem /></Suspense>; }
function Rehearse() { return <Suspense fallback={<ToolLoading />}><LazyRehearse /></Suspense>; }
// My crisis kit (DT-03): open it or make it, two skills under one tool id (docs/design/crisis-kit.md).
const LazyCrisisKit = lazy(() => import('./tools/CrisisKit').then((m) => ({ default: m.CrisisKit })));
function CrisisKit() { return <Suspense fallback={<ToolLoading />}><LazyCrisisKit /></Suspense>; }
// Know this feeling (ER-10): the card, or the myth cards on `?frame=myths` (docs/design/emotion-guide.md).
const LazyEmotionGuide = lazy(() => import('./tools/EmotionGuide').then((m) => ({ default: m.EmotionGuide })));
function EmotionGuide() { return <Suspense fallback={<ToolLoading />}><LazyEmotionGuide /></Suspense>; }

// Map tool IDs to their interactive components
const toolComponents: Record<string, React.ComponentType> = {
  'cool-down': CoolDown,
  'five-senses': FiveSenses,
  'pause': Pause,
  'urge-surfing': UrgeSurfing,
  'opposite-action': OppositeAction,
  'dear-man': DearMan,
  'problem-solve': ProblemSolve,
  'cope-ahead': CopeAhead,
  'fast': Fast,
  'say-no': SayNo,
  'give': Give,
  'mindfulness-of-others': NoticeThem,
  'rehearse': Rehearse,
  'crisis-kit': CrisisKit,
  'emotion-guide': EmotionGuide,
  'recovering-from-invalidation': InvalidationRecovery,
  'find-the-feeling': FindTheFeeling,
  'meet-a-part': MeetAPart,
  'two-pulls': TwoPulls,
  'wise-mind': WiseMind,
};

export function ToolPage() {
  const { toolId: segment } = useParams<{ toolId: string }>();
  const location = useLocation();
  const toolId = segment ? toolIdFromUrl(segment) : undefined;
  const tool = toolId ? getToolById(toolId) : undefined;
  // Meet a part opens only with parts on and its copy signed off; otherwise it is "not found".
  const gate = useToolGate(tool?.id, location.search);
  const partsOn = useUserProfile().profile.partsEnabled;
  const { label } = useOfficialNames();
  useEffect(() => {
    if (!partsOn) return;
    if (tool?.id === 'meet-a-part') void loadMeetAPart().catch(() => { /* the render retries */ });
    if (tool?.id === 'two-pulls') void loadTwoPulls().catch(() => { /* the render retries */ });
  }, [tool?.id, partsOn]);

  // Old address (/tool/cool-down): forward to the tool's own name, keeping the query and the
  // link state (Help me now / check-in / hand-off context for the session).
  if (segment && TOOL_URL_SLUGS[segment]) {
    return <Navigate to={{ pathname: `/tool/${TOOL_URL_SLUGS[segment]}`, search: location.search }} state={location.state} replace />;
  }

  if (tool && gate === 'loading') {
    return (
      <div className="py-12 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!tool || gate === 'closed') {
    return <ToolNotFound />;
  }

  const playerSkill = legacyLink(tool.id, location.search) ? null : playerSkillFor(tool.id);
  const ToolComponent = playerSkill ? undefined : toolComponents[tool.id];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
      >
        <span aria-hidden="true">←</span>
        <span>All tools</span>
      </Link>

      {/* Tool header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl" role="img" aria-hidden="true">
            {tool.emoji}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">
            {label(tool)}
          </h1>
        </div>
        {!tool.bare && (
          <p className="text-lg text-[var(--color-text-secondary)]">
            {tool.tagline}
          </p>
        )}
      </div>

      {/* When to use */}
      {!tool.bare && (
        <div className="mb-8 p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            When to use this
          </p>
          <p className="text-[var(--color-text-primary)]">
            {tool.whenToUse}
          </p>
        </div>
      )}

      {/* Interactive tool component */}
      <div className="mb-8">
        {playerSkill || ToolComponent ? (
          // One ToolSession per visit (PR-S3). It replaces trackToolUsage: startToolSession writes the
          // compat ToolUsage at the same moment, linked to the check-in the tool was opened from.
          <ToolSessionProvider key={location.key} toolId={tool.id} deferStart={!!tool.deferSession}>
            {playerSkill ? <PlayedTool skillId={playerSkill} /> : ToolComponent && <ToolComponent />}
          </ToolSessionProvider>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-[var(--color-border)] text-center">
            <p className="text-[var(--color-text-tertiary)] italic">
              Interactive tool coming soon...
            </p>
          </div>
        )}
      </div>

      {/* DBT context (collapsible) */}
      {tool.dbtBasis && (
        <details className="group">
          <summary className="cursor-pointer inline-flex items-center min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors rounded">
            <span aria-hidden="true" className="mr-1 group-open:hidden">+</span>
            <span aria-hidden="true" className="mr-1 hidden group-open:inline">−</span>
            What this is based on
          </summary>
          <div className="mt-2 p-4 rounded-lg bg-[var(--color-bg-elevated)]/50 text-sm text-[var(--color-text-secondary)]">
            <p>
              This tool is based on <strong>{tool.dbtBasis}</strong>, a skill from Dialectical Behavior Therapy (DBT).
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
