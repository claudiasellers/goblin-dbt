import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { HandoffResult } from '../../data/capacityTypes';
import type { CopeAheadContent } from '../../data/copeAheadTypes';
import type { PartsContent } from '../../data/partsContentTypes';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useProfileContext } from '../../hooks/useProfileContext';
import { useToolSession } from '../../hooks/useToolSession';
import { handoffExt } from '../../lib/bandStore';
import { anchorLead, COPE_AHEAD_TITLE, copeAheadPartsReady, copeParts, keptLines, showCopeAhead } from '../../lib/copeAhead';
import { afterScheduleItem, COPE_AHEAD_AFTER_TYPE } from '../../lib/copeAheadAfter';
import { parseCopeAheadEntry } from '../../lib/copeAheadEntry';
import { planLine } from '../../lib/copeAheadPlan';
import {
  COPE_EXIT_STEP, copeNext, copeSessionExt, dangerBanner, initialCope, momentText, planCa,
  type CopeEvent, type CopeSettle, type CopeState,
} from '../../lib/copeAheadTool';
import { profileCache } from '../../lib/profileCache';
import { newId } from '../../lib/spine/ids';
import { pullChoices, type PullChoice } from '../../lib/urgeSurfing';
import { partChipLabel as unnamedOrName } from '../../lib/partTag';
import { getCopeAheadContent } from '../../services/copeAhead';
import { getFindTheFeelingContent } from '../../services/neo4j';
import { getPartsContent } from '../../services/partsContent';
import { getSpineContent, scheduleFollowUps } from '../../services/spine';
import { recordWitnessBeat } from '../../services/witness';
import { TooMuchLink } from '../../components/capacity/TooMuchLink';
import { CrisisBanner } from '../../components/safety/CrisisBanner';
import { AgainScreen, FeelScreen, MomentScreen, NewMomentScreen, PlanScreen, WhatScreen } from '../../components/tools/copeAhead/PlanScreens';
import { Rehearse } from '../../components/tools/copeAhead/Rehearse';
import { Settle } from '../../components/tools/copeAhead/Settle';
import { KeepCard } from '../../components/tools/copeAhead/KeepCard';

const HOST = 'cope-ahead';

// DEAR MAN's cope ahead step, reused as is (parts on): fetched once its gate holds.
const loadCope = () => import('../../components/parts/CopeAheadStep');
const LazyCopeAheadStep = lazy(() => loadCope().then((m) => ({ default: m.CopeAheadStep })));
function CopeAheadStep(p: ComponentProps<typeof LazyCopeAheadStep>) { return <Suspense fallback={null}><LazyCopeAheadStep {...p} /></Suspense>; }
// The anchor under the plan (setPartAnchor): the same, so a parts-off visit never fetches either.
const loadAnchor = () => import('../../components/tools/copeAhead/PlanAnchor');
const LazyPlanAnchor = lazy(() => loadAnchor().then((m) => ({ default: m.PlanAnchor })));
function PlanAnchor(p: ComponentProps<typeof LazyPlanAnchor>) { return <Suspense fallback={null}><LazyPlanAnchor {...p} /></Suspense>; }

/**
 * Cope Ahead (docs/design/cope-ahead.md): what's coming, what might show up, the hardest moment, the plan,
 * rehearse it, settle, keep it. The step machine (src/lib/copeAheadTool.ts) decides; the plan line comes
 * from src/lib/copeAheadPlan.ts; screens 5-7 are their own components. This page renders, keeps the
 * visit's ToolSession up to date (`ext.ca`, the feelings, the pull), saves *Keep this* as an own line on
 * that tap only, schedules the after card on *Yes*, and hands off to 5-4-3-2-1 through `linkTo` after
 * saving. TooMuchLink on every screen; no band gate; a danger moment shows CrisisBanner alongside.
 */
export function CopeAhead() {
  const [content, setContent] = useState<CopeAheadContent | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    getCopeAheadContent().then((c) => { if (live) setContent(c); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);
  if (failed) return null;
  if (!content) {
    return (
      <div className="py-8 flex justify-center" aria-busy="true">
        <span className="inline-block w-6 h-6 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full motion-safe:animate-spin" aria-hidden="true" />
      </div>
    );
  }
  return <CopeVisit content={content} />;
}

function CopeVisit({ content }: { content: CopeAheadContent }) {
  const toolSession = useToolSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [entry] = useState(() => parseCopeAheadEntry(location.search, content));
  const [st, setSt] = useState<CopeState>(initialCope);
  const [keep, setKeep] = useState<'idle' | 'saving' | 'kept' | 'failed'>('idle');
  const handoffs = useRef<HandoffResult[]>([]);

  // Find the feeling's four pulls (Urge Surfing's chips): the question is left out if they can't load.
  const [pulls, setPulls] = useState<PullChoice[]>([]);
  useEffect(() => {
    let live = true;
    getFindTheFeelingContent().then((c) => { if (live) setPulls(pullChoices(c)); }).catch(() => { /* no pull question */ });
    return () => { live = false; };
  }, []);

  // Parts on: DEAR MAN's cope ahead step on screen 2, the anchor under the plan on screen 4.
  const partsOn = useUserProfile().profile.partsEnabled;
  const profile = useProfileContext('cope-ahead', { enabled: partsOn });
  const [partsContent, setPartsContent] = useState<PartsContent | null | false>(null);
  useEffect(() => {
    if (!partsOn || partsContent !== null) return;
    let live = true;
    getPartsContent().then((p) => { if (live) setPartsContent(p); }).catch(() => { if (live) setPartsContent(false); });
    return () => { live = false; };
  }, [partsOn, partsContent]);
  const [savedAnchors, setSavedAnchors] = useState<Record<string, string>>({});
  const slices = profile.slices;
  const partsCopy = partsContent || null;
  const partsShown = showCopeAhead({ partsOn, partCount: slices?.parts.length ?? 0, ready: copeAheadPartsReady(partsCopy), band: null });
  useEffect(() => {
    if (!partsShown) return;
    void loadCope().catch(() => { /* the step's render retries */ });
    void loadAnchor().catch(() => { /* the render retries */ });
  }, [partsShown]);
  const anchors = useMemo(() => ({ ...(slices?.partAnchors ?? {}), ...savedAnchors }), [slices, savedAnchors]);
  const lines = useMemo(() => keptLines(slices?.ownLines, slices?.savedLines), [slices]);
  const part = partsShown && st.partId ? slices?.parts.find((p) => p.id === st.partId) ?? null : null;
  // A link's part (DEAR MAN's summary): preset once in the parts step, only if it is one of their kept parts
  // (the chips copeParts shows). They can change it; Not sure / Skip clear it.
  const preset = useRef(entry.presetPartId);
  useEffect(() => {
    const id = preset.current;
    if (!id || st.step !== 'feel' || !partsShown || !slices) return;
    preset.current = null;
    if (copeParts(slices.parts).some((p) => p.id === id)) setSt((x) => (x.partId ? x : copeNext(x, { type: 'part', partId: id }, content)));
  }, [st.step, partsShown, slices, content]);
  const onAnchor = (partId: string, text: string, version: number) => {
    setSavedAnchors((a) => ({ ...a, [partId]: text }));
    profileCache.bump(version);
  };

  /** The session always carries what the visit has said so far, so whichever close happens sends it. */
  const sync = useCallback((s: CopeState) => {
    toolSession.setStep(COPE_EXIT_STEP[s.step]);
    toolSession.setExt({ ca: copeSessionExt(s) });
    toolSession.setEmotionIds(s.feelIds);
    toolSession.setUrgeIds(s.pull && s.pull !== 'not_sure' ? [s.pull] : []);
    if (s.rehearsed > 0) toolSession.markPracticed();
    if (s.step === 'settle' || s.step === 'keep') toolSession.markComplete();
  }, [toolSession]);
  useEffect(() => { sync(st); }, [st, sync]);

  const send = (e: CopeEvent) => setSt((x) => copeNext(x, e, content));
  const s = st;
  const plan = useMemo(() => planLine(content, planCa(s, 1)), [content, s]);
  const passPlan = useMemo(() => planLine(content, planCa(s, s.pass)), [content, s]);
  const banner = dangerBanner(s, content);
  const danger = banner ? <CrisisBanner compact variant={banner} /> : null;

  const settle = async (choice: CopeSettle) => {
    const next = copeNext(s, { type: 'settle', settle: choice }, content);
    sync(next);
    if (choice === 'five_senses') {
      // The plan is saved first: the visit closes (completed, ext.ca with the plan), then 5-4-3-2-1 opens.
      await toolSession.close({ status: 'completed' });
      const to = toolSession.linkTo('five-senses');
      navigate(to.pathname, { state: to.state });
      return;
    }
    setSt(next);
  };

  const keepIt = async () => {
    if (!plan.text || keep === 'saving' || keep === 'kept' || !toolSession.persisted) return;
    setKeep('saving');
    try {
      await recordWitnessBeat({
        hostKind: 'tool_session', hostId: toolSession.id, moment: 'cope_ahead', shown: [], skipped: false, noneFit: false,
        ownLine: { id: newId(), text: plan.text, emotionIds: [] },
      });
      setKeep('kept');
      send({ type: 'kept', kept: true });
    } catch {
      setKeep('failed');
    }
  };

  const askAfter = async (yes: boolean) => {
    send({ type: 'followUp', yes });
    if (!yes || !toolSession.persisted) return;
    try {
      const spine = await getSpineContent();
      const type = spine.followUpTypes.find((t) => t.id === COPE_AHEAD_AFTER_TYPE && t.enabled);
      // Screen 1's when is the window chip (Later, or not sure when it wasn't answered).
      const item = type ? afterScheduleItem(type, s.when ?? 'later', newId(), new Date()) : null;
      if (!item) return;
      await scheduleFollowUps([item], { sourceSessionId: toolSession.id, sourceToolId: HOST });
    } catch { /* the after card is a nice-to-have: nothing to undo */ }
  };

  const anchorBlock: ReactNode = part && partsCopy ? (
    <PlanAnchor content={partsCopy} part={part} anchor={anchors[part.id] ?? null} lines={lines} onAnchor={onAnchor} />
  ) : null;
  const cardAnchor = part && partsCopy && anchors[part.id]
    ? { name: part.name?.trim() || unnamedOrName(part, partsCopy), line: anchors[part.id], lead: anchorLead(partsCopy, part.name) }
    : null;

  let body: ReactNode = null;
  switch (s.step) {
    case 'what':
      body = <WhatScreen content={content} s={s} send={send} firstSituationId={entry.firstSituationId} />;
      break;
    case 'feel':
      body = (
        <FeelScreen content={content} s={s} send={send} pulls={pulls}
          partsStep={partsShown && partsCopy && slices ? (
            <CopeAheadStep content={partsCopy} parts={copeParts(slices.parts)} anchors={anchors} lines={lines}
              picked={s.partId} onPick={(id) => send({ type: 'part', partId: id })} onAnchor={onAnchor} onGoOn={() => {}}
              titleId={COPE_AHEAD_TITLE} />
          ) : null} />
      );
      break;
    case 'moment':
      body = <MomentScreen content={content} s={s} send={send} danger={danger} />;
      break;
    case 'plan':
      body = <PlanScreen content={content} s={s} send={send} plan={plan} anchor={anchorBlock} danger={danger} />;
      break;
    case 'rehearse': {
      const p = s.pass === 2
        ? { id: s.newMomentId, own: s.newMomentOwn }
        : { id: s.hardMomentId, own: s.hardMomentOwn };
      body = (
        <Rehearse key={s.pass} content={content} moment={momentText(content, p.id, p.own)} plan={passPlan} pass={s.pass}
          onDone={() => send({ type: 'rehearsed' })} />
      );
      break;
    }
    case 'again':
      body = <AgainScreen content={content} send={send} />;
      break;
    case 'newMoment':
      body = <NewMomentScreen content={content} s={s} send={send} />;
      break;
    case 'settle':
      body = <Settle content={content} onChoose={(c) => { void settle(c); }} />;
      break;
    case 'keep':
      body = (
        <KeepCard content={content} plan={plan} anchor={cardAnchor}
          keep={keep} onKeep={() => { void keepIt(); }} onNotNow={() => send({ type: 'kept', kept: false })}
          askAfter={s.followUp} onAskAfter={(yes: boolean) => { void askAfter(yes); }}
          onDone={() => navigate('/tools')} />
      );
      break;
  }

  return (
    <div className="space-y-5" data-testid="cope-ahead-page">
      <div key={`${s.step}:${s.pass}`} className="space-y-4 motion-safe:animate-[stepEnter_300ms_ease-out]">{body}</div>
      <div className="flex justify-center">
        <TooMuchLink host={HOST} onResult={(r) => { handoffs.current.push(r); toolSession.setExt({ er: { handoffs: handoffExt(handoffs.current) } }); }} />
      </div>
    </div>
  );
}
