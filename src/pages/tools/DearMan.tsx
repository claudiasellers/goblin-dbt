import { Suspense, lazy, useState, useEffect, useCallback, useMemo, useRef, type ComponentProps } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDearManContent, saveDearManSession } from '../../services/neo4j';
import { newId } from '../../lib/spine/ids';
import { useToolSession } from '../../hooks/useToolSession';
import { dearManRepSource } from '../../lib/spine/wrap';
import type { DearManContentResult } from '../../data/dearManTypes';
import { ToolLoadError } from '../../components/tools/ToolLoadError';
import { ToolLoading } from '../../components/tools/ToolLoading';
import { LazyMotion, domAnimation } from 'motion/react';
import { isDearManHandoff, type DearManHandoff } from '../../data/dearManHandoff';
import { BreathOrb, type BreathPhase } from '../../components/tools/regulation/body';
import { linkButton, secondaryText } from '../../components/tools/oppositeAction/styles';
import { fill } from '../../lib/invalidationRecovery';
import { handoffPrefill, summaryHeadsUpForBand } from '../../lib/dearManSafety';
import { CopeAheadEntryLink } from '../../components/tools/copeAhead/CopeAheadEntryLink';
import type { CapacityReading, HandoffResult } from '../../data/capacityTypes';
import { useBand } from '../../hooks/useBand';
import { BreakdownHandoff } from '../../components/capacity/BreakdownHandoff';
import { TooMuchLink } from '../../components/capacity/TooMuchLink';
import { handoffExt, makeReading } from '../../lib/bandStore';
import { dropResumeToken, peekResumeToken } from '../../lib/resumeToken';
import { scheduleResumeLater } from '../../services/capacity';
import { dearManDraftOf, dearManStepFromId, dearManStepId, isDearManDraft, TOO_MUCH_PHASES, type DearManDraft, type DearManStep } from '../../lib/dearManResume';
import { feelingEmotionWords, feelingLabel, hurtFeelingChip } from '../../lib/dearManHurt';
import { getPartsContent } from '../../services/partsContent';
import type { PartsContent, PartsHurt } from '../../data/partsContentTypes';
import { useUserProfile } from '../../contexts/UserProfileContext';
import { useProfileContext } from '../../hooks/useProfileContext';
import { profileCache } from '../../lib/profileCache';
import { anchorLead, copeExt, copeParts, copeReady, keptLines, showCopeAhead } from '../../lib/copeAhead';
import { focusLine, focusLost, focusStepStart } from '../../lib/focusStart';
import { PersonPicker } from '../../components/people/PersonPicker';
import { PersonSafetyRoute } from '../../components/people/PersonSafetyRoute';
import { PERSON_SAFETY_ROUTE_COPY, fillWho, pickerCopy, withAnswer, type KeptPerson, type PickedPerson } from '../../lib/people';
import { roleLabel } from '../../data/people';
import { ASK_OUTCOME_CHIPS, debriefLink, offerLetGo, type AskOutcomeChip } from '../../lib/dearManDebrief';
import { getSpineContent, scheduleFollowUps } from '../../services/spine';
import { dueAtFor } from '../../lib/spine/windows';

type Phase =
  | 'entry'
  | 'check'
  | 'handoff'
  | 'person-safety'
  | 'scene'
  | 'cope'
  | 'describe'
  | 'express'
  | 'assert'
  | 'reinforce'
  | 'mindful'
  | 'confident'
  | 'negotiate'
  | 'summary';

// UI-only labels (not therapeutic content)
const relationshipTypes = [
  { id: 'partner', label: 'Partner' },
  { id: 'boss', label: 'Boss' },
  { id: 'friend', label: 'Friend' },
  { id: 'parent', label: 'Parent' },
  { id: 'roommate', label: 'Roommate' },
  { id: 'coworker', label: 'Coworker' },
  { id: 'other', label: 'Someone else' },
];

const priorityOptions = [
  { id: 'objective', label: 'Getting what I need' },
  { id: 'relationship', label: 'Keeping the relationship strong' },
  { id: 'self-respect', label: 'Keeping my self-respect intact' },
];

// Presentation-only: maps a feeling group's colorKey (from the graph) to a theme token
const feelingGroupColors: Record<string, string> = {
  pink: 'var(--color-tag-pink)',
  rose: 'var(--color-q-hu-fill)',
  orange: 'var(--color-tag-orange)',
  blue: 'var(--color-q-lu-fill)',
  purple: 'var(--color-tag-purple)',
  teal: 'var(--color-tag-teal)',
  neutral: 'var(--color-text-tertiary)',
};

const inputClass = 'w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
const textareaClass = `${inputClass} resize-none`;

// Cope ahead's step loads on demand: fetched once its gate holds (copeShown, prefetched below before its
// phase), in its own Suspense with nothing in its place.
const loadCope = () => import('../../components/parts/CopeAheadStep');
const LazyDearManOne = lazy(() => import('../../components/tools/dearMan/DearManOne').then((m) => ({ default: m.DearManOne })));
const LazyDearManDebrief = lazy(() => import('../../components/tools/dearMan/DearManDebrief').then((m) => ({ default: m.DearManDebrief })));
const LazyCopeAheadStep = lazy(() => loadCope().then((m) => ({ default: m.CopeAheadStep })));
function CopeAheadStep(p: ComponentProps<typeof LazyCopeAheadStep>) { return <Suspense fallback={null}><LazyCopeAheadStep {...p} /></Suspense>; }

/**
 * DEAR MAN's page: the prep (this file), the debrief (`?mode=debrief`, docs/design/dear-man-debrief.md), or One message
 * (`?mode=one`, docs/design/one-message.md): who it was with, then that skill on the skill player. The mode is read once: a link to the other mode is a
 * new visit (ToolPage keys the session by location).
 */
export function DearMan() {
  const { search } = useLocation();
  const [mode] = useState(() => new URLSearchParams(search).get('mode'));
  if (mode === 'debrief') return <Suspense fallback={<ToolLoading />}><LazyDearManDebrief /></Suspense>;
  if (mode === 'one') return <Suspense fallback={<ToolLoading />}><LazyDearManOne /></Suspense>;
  return <DearManPrep />;
}

function DearManPrep() {
  const session = useToolSession();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { checkinEmotions?: string[]; dearManHandoff?: unknown } | null;
  const checkinEmotions = routeState?.checkinEmotions;
  // Handoff from "Recover from a hurtful moment": already-answered context, read once on mount.
  const routeHandoff = routeState?.dearManHandoff;
  const [handoff, setHandoff] = useState<DearManHandoff | null>(() => (isDearManHandoff(routeHandoff) ? routeHandoff : null));
  const initialHandoff = useRef(handoff);
  // "Come back to this later" (P2): /tool/dear-man?resume=<the earlier session id>. The draft lives
  // only on this device; peeked here (StrictMode-safe) and dropped after mount.
  const resumeId = new URLSearchParams(location.search).get('resume');
  const [resumed] = useState(() => {
    if (!resumeId || !/^[0-9a-f-]{36}$/i.test(resumeId)) return null;
    const t = peekResumeToken('dear-man', resumeId);
    return { token: t && isDearManDraft(t.draft) ? t : null };
  });
  useEffect(() => { if (resumeId) dropResumeToken(resumeId); }, [resumeId]);

  // ── Graph content (loaded once) ──
  const [content, setContent] = useState<DearManContentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Phase state ──
  // Check-in entry: the band gate carries the check-in's band silently (no second question). A
  // resumed draft goes through the gate too (the band it left on is stale by now).
  const [phase, setPhase] = useState<Phase>(
    resumed?.token ? 'check' : handoff ? 'scene' : checkinEmotions?.length ? 'check' : 'entry');
  const [sceneStep, setSceneStep] = useState(0);

  // ── Scene data ──
  const [relationshipType, setRelationshipType] = useState<string | null>(null);
  // Who it's with and their safety answer (IE-03 + D4): the picker on scene 0. `pickerKey` remounts it after
  // *This is about someone else* on the safety route.
  const [person, setPerson] = useState<PickedPerson | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  const [situationType, setSituationType] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<string[]>(priorityOptions.map(p => p.id));
  const [removedPriorities, setRemovedPriorities] = useState<string[]>([]);
  const [barriers, setBarriers] = useState<string[]>([]);
  const [barriersCustom, setBarriersCustom] = useState('');

  // ── Script data (ID-based + custom escape hatches) ──
  // Describe: the text box is always visible; tapping an option drops its text in as a template.
  const [describeId, setDescribeId] = useState<string | null>(null);
  const [describeCustom, setDescribeCustom] = useState('');

  const [feelings, setFeelings] = useState<string[]>([]);
  const [feelingCustom, setFeelingCustom] = useState('');
  const [showFeelingCustom, setShowFeelingCustom] = useState(false);
  const [showMirror, setShowMirror] = useState(false);

  // Assert: multi-select, with an optional elaboration per selected option
  const [assertIds, setAssertIds] = useState<string[]>([]);
  const [assertDetails, setAssertDetails] = useState<Record<string, string>>({});
  const [assertCustom, setAssertCustom] = useState('');
  const [showAssertCustom, setShowAssertCustom] = useState(false);

  const [reinforceIds, setReinforceIds] = useState<string[]>([]);
  const [reinforceCustom, setReinforceCustom] = useState('');
  const [showReinforceCustom, setShowReinforceCustom] = useState(false);

  // ── Prep data ──
  const [anchorPhrase, setAnchorPhrase] = useState('');
  const [showAnchorGen, setShowAnchorGen] = useState(false);
  const [anchorNeedId, setAnchorNeedId] = useState<string | null>(null);
  const [anchorShowAll, setAnchorShowAll] = useState(false);

  const [middleGroundId, setMiddleGroundId] = useState<string | null>(null);
  const [middleGroundCustom, setMiddleGroundCustom] = useState('');
  const [showMiddleGroundCustom, setShowMiddleGroundCustom] = useState(false);

  const [walkAwayId, setWalkAwayId] = useState<string | null>(null);
  const [walkAwayCustom, setWalkAwayCustom] = useState('');
  const [showWalkAwayCustom, setShowWalkAwayCustom] = useState(false);

  // ── Cope ahead (parts on): the part picked (its id rides in ext.er and the resume draft, never its
  // anchor) and anchors saved on this visit (over the profile slice, which is cached) ──
  const [copeAheadPartId, setCopeAheadPartId] = useState<string | null>(null);
  const [copeAnchors, setCopeAnchors] = useState<Record<string, string>>({});

  // ── The band (A4-4): asked on the first screen (BandGate), carried within 20 min; flooded → P2 ──
  const band = useBand();
  const [showCarry, setShowCarry] = useState(true);
  const [bandReading, setBandReading] = useState<CapacityReading | null>(null);
  /** Ask even if a reading is current (a flooded hand-off from Recover is re-asked once, D-07). */
  const [, setGateForce] = useState(false);
  /** Where the gate (and P2) goes next: the scene by default, or the step a resumed draft left on. */
  // A draft with no person (saved before the picker shipped, or while its copy was missing) resumes at scene 0, so
  // the safety question is asked before any plan step (the draft's answers still fill the later steps).
  const afterGate = useRef<DearManStep>(resumed?.token && (resumed.token.draft as DearManDraft).person
    ? dearManStepFromId(resumed.token.stepId) : { phase: 'scene', sceneStep: 0 });
  const handoffs = useRef<HandoffResult[]>([]);
  // Claudia, 30 Sep: DEAR MAN doesn't open with the band question or the breathing hand-off. Planning
  // a conversation is a thinking moment. Every route into 'check' goes straight on to
  // the planned step; the "still loud" heads-up on the Summary and the too-much link stay.
  useEffect(() => {
    if (phase !== 'check') return;
    const t = afterGate.current;
    // "Picking up where we were." was keyed to 'check'; move it to where we land (Codex, #21).
    setResumeNote((n) => (n && n.phase === 'check' ? { ...n, phase: t.phase } : n));
    setSceneStep(t.sceneStep);
    setPhase(t.phase);
  }, [phase]);
  /** "Picking up where we were." / "You were in the middle of something earlier.", on one screen. */
  const [resumeNote, setResumeNote] = useState<{ kind: 'resumed' | 'stale'; phase: Phase } | null>(() => (
    resumed ? (resumed.token ? { kind: 'resumed', phase: 'check' } : { kind: 'stale', phase: 'entry' }) : null));
  /** Heads-up on the Summary when it's still loud: offered, breathing, cooled, or waved off. Never a lock. */
  const [headsUp, setHeadsUp] = useState<'offer' | 'breathing' | 'cooled' | 'dismissed'>('offer');

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // ── P2 resume draft (device-only) ──
  const applyDraft = (d: DearManDraft) => {
    setRelationshipType(d.relationshipType); setSituationType(d.situationType);
    if (d.priorities.length) setPriorities(d.priorities);
    setBarriers(d.barriers); setBarriersCustom(d.barriersCustom);
    setDescribeId(d.describeId); setDescribeCustom(d.describeCustom);
    setFeelings(d.feelings); setFeelingCustom(d.feelingCustom); setShowFeelingCustom(Boolean(d.feelingCustom));
    setAssertIds(d.assertIds); setAssertDetails(d.assertDetails); setAssertCustom(d.assertCustom);
    setReinforceIds(d.reinforceIds); setReinforceCustom(d.reinforceCustom);
    setAnchorPhrase(d.anchorPhrase);
    setMiddleGroundId(d.middleGroundId); setMiddleGroundCustom(d.middleGroundCustom);
    setWalkAwayId(d.walkAwayId); setWalkAwayCustom(d.walkAwayCustom);
    setCopeAheadPartId(d.copeAheadPartId ?? null);
    if (d.copeAheadPartId) session.setExt(copeExt(d.copeAheadPartId));
    setPerson(d.person ?? null);
  };
  const draftOf = (): DearManDraft => dearManDraftOf({
    relationshipType, situationType, priorities, barriers, barriersCustom, describeId, describeCustom,
    feelings, feelingCustom, assertIds, assertDetails, assertCustom, reinforceIds, reinforceCustom,
    anchorPhrase, middleGroundId, middleGroundCustom, walkAwayId, walkAwayCustom, copeAheadPartId,
    person: person && person.route !== 'safety' ? { ...person, route: person.route } : null,
  });

  // ── Load content from graph (on mount, and on explicit retry) ──
  const loadInFlight = useRef(false);
  const loadContent = useCallback(() => {
    if (loadInFlight.current) return; // repeated retries can't overlap
    loadInFlight.current = true;
    setLoading(true);
    setError(null);
    getDearManContent()
      .then(data => {
        setContent(data);
        // Prefill from a handoff: situation type (graph-named, verified to exist) + the feeling
        const h = initialHandoff.current;
        if (h) {
          const pre = handoffPrefill(h, data, data.safetyCopy?.handoffSituationId);
          if (pre.situationType) setSituationType(pre.situationType);
          if (pre.feelings.length) setFeelings(pre.feelings);
          if (pre.feelingCustom) { setFeelingCustom(pre.feelingCustom); setShowFeelingCustom(true); }
          initialHandoff.current = null;
          // Recover's band comes over as a `handoff` reading, flooded included: DEAR MAN no longer
          // asks, so the carried value is what drives the Summary's "still loud" note (Codex, #21).
          const fresh = h.band && h.bandAt && Date.now() - Date.parse(h.bandAt) <= (band.content?.freshMinutes ?? 20) * 60_000;
          if (h.band && h.bandAt && fresh) {
            const r = makeReading({
              value: h.band, source: 'handoff', context: 'dear-man', hostSessionId: session.id || undefined,
              carriedFrom: { readingId: newId(), context: 'recovering-from-invalidation', at: h.bandAt },
            }, newId(), new Date());
            setBandReading(r);
            session.setBandAtStart(r);
          } else {
            setGateForce(h.band === 'flooded');
            setPhase('check');
          }
        } else if (resumed?.token && isDearManDraft(resumed.token.draft)) {
          applyDraft(resumed.token.draft);
        }
      })
      .catch(() => { setError("This tool couldn't load. Try again, or choose another tool."); })
      .finally(() => { loadInFlight.current = false; setLoading(false); });
  // Mount-time hand-over only: the session id, route state and resume draft are fixed for this visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);
  useEffect(() => { band.load(); }, [band]);

  // Recover's angry-part card: the hurt picked there is the first "I felt" chip, not selected. The
  // shipped parts content is read only when a hurt is in play (a hand-off's, or one a resumed draft
  // saved); otherwise Express is exactly as it was.
  const [partsHurts, setPartsHurts] = useState<PartsHurt[] | null>(null);
  const hurtInPlay = Boolean(handoff?.hurtId)
    || Boolean(content && feelings.some(id => !content.feelingChips.some(f => f.id === id)));
  useEffect(() => {
    if (!hurtInPlay || partsHurts) return;
    let live = true;
    getPartsContent().then(p => { if (live) setPartsHurts(p.hurts); }).catch(() => { /* no chip */ });
    return () => { live = false; };
  }, [hurtInPlay, partsHurts]);
  const hurtChip = useMemo(() => hurtFeelingChip(handoff?.hurtId, partsHurts, feelings), [handoff, partsHurts, feelings]);

  // DEAR MAN's declared profile slices (never partDetail): the people the picker lists (IE-03), and for cope
  // ahead per part ("Who might show up in this conversation?") parts, kept lines and anchors, empty with parts off.
  const partsOn = useUserProfile().profile.partsEnabled;
  const copeProfile = useProfileContext('dear-man');
  /** The people slice with this visit's answers folded in (src/lib/people.ts withAnswer): the slice doesn't reload. */
  const [answeredPeople, setAnsweredPeople] = useState<KeptPerson[] | null>(null);
  /** The kept person this plan is with (their refusal count steers Let go), or null. */
  const keptPerson = person?.personId
    ? (answeredPeople ?? copeProfile.slices?.people ?? []).find(k => k.id === person.personId) ?? null : null;
  /** The shipped parts content for the cope copy: null while loading, false when it couldn't load. */
  const [copeContent, setCopeContent] = useState<PartsContent | null | false>(null);
  useEffect(() => {
    if (!partsOn || copeContent !== null) return;
    let live = true;
    getPartsContent().then(p => { if (live) setCopeContent(p); }).catch(() => { if (live) setCopeContent(false); });
    return () => { live = false; };
  }, [partsOn, copeContent]);
  const copeSlices = copeProfile.slices;
  const copeCopy = copeContent || null;
  const copeShown = showCopeAhead({
    partsOn, partCount: copeSlices?.parts.length ?? 0, ready: copeReady(copeCopy),
    band: bandReading?.value ?? band.current()?.value ?? null,
  });
  /** Parts on, but the slices or the copy are still on their way: the cope step waits rather than skip. */
  const copePending = partsOn && (copeProfile.status === 'loading' || copeContent === null);
  const copeAnchorMap = useMemo(() => ({ ...(copeSlices?.partAnchors ?? {}), ...copeAnchors }), [copeSlices, copeAnchors]);
  const copeLines = useMemo(() => keptLines(copeSlices?.ownLines, copeSlices?.savedLines), [copeSlices]);
  // A resumed draft (or Back) can land on the step after parts went off or the part went: go on.
  useEffect(() => {
    if (phase === 'cope' && !copeShown && !copePending) setPhase('describe');
  }, [phase, copeShown, copePending]);
  const pickCopePart = (id: string | null) => {
    setCopeAheadPartId(id);
    session.setExt(copeExt(id));
  };
  /** The anchor carried to the Summary, under the script: the picked part's, when it has one. */
  const copePart = copeAheadPartId ? copeSlices?.parts.find(p => p.id === copeAheadPartId) ?? null : null;
  const copeCarry = partsOn && copeCopy && copeReady(copeCopy) && copePart && copeAnchorMap[copePart.id]
    ? { lead: anchorLead(copeCopy, copePart.name), anchor: copeAnchorMap[copePart.id] }
    : null;

  // Fetch each parts step as soon as its gate holds, so it is there when its phase comes.
  useEffect(() => { if (copeShown) void loadCope().catch(() => { /* the step's render retries */ }); }, [copeShown]);

  // ── Pre-fill feelings from check-in emotions ──
  useEffect(() => {
    if (content && checkinEmotions?.length) {
      const matchedIds = checkinEmotions
        .map(e => content.feelingChips.find(
          f => f.label.toLowerCase() === e.toLowerCase()
        )?.id)
        .filter((id): id is string => id != null);
      if (matchedIds.length) setFeelings(matchedIds);
    }
  }, [content, checkinEmotions]);

  // The session's emotions when it opened without any: Recover's word (its hand-over carries no
  // checkinEmotions) and the Express feelings, matched to graph words by label (chips that aren't
  // a graph word, e.g. "Small", are dropped).
  // The hurt chip counts as its NAMED_AS Emotion ids.
  useEffect(() => {
    const labels = content ? feelingEmotionWords(feelings, content.feelingChips, hurtChip) : [];
    session.setEmotionIds([...(handoff?.emotionId ? [handoff.emotionId] : []), ...labels]);
  }, [content, feelings, handoff, session, hurtChip]);

  // Where cope ahead's step hands back (its go-on), focus lands on DEAR MAN's next step (its heading or
  // first line) instead of the page: the parts control that had it is gone. Held while that step is up. DEAR MAN's other step changes are unchanged.
  const viewRoot = useRef<HTMLDivElement>(null);
  const handedBackTo = useRef<Phase | null>(null);
  const handBack = (next: Phase) => { handedBackTo.current = next; setPhase(next); };
  useEffect(() => {
    if (handedBackTo.current !== phase) { handedBackTo.current = null; return; }
    if (focusLost()) focusStepStart(viewRoot.current);
  });

  // ── Loading / Error states ──
  if (loading && !content) {
    return <ToolLoading label="Loading the conversation builder…" />;
  }
  if (error || !content) {
    return <ToolLoadError onRetry={loadContent} retrying={loading} message={error ?? undefined} />;
  }

  // ── Helpers ──

  const goBack = () => {
    switch (phase) {
      case 'check':
      case 'handoff':
        setPhase('entry');
        break;
      case 'person-safety': setPerson(null); setRelationshipType(null); setPhase('scene'); setSceneStep(0); setPickerKey(k => k + 1); break;
      case 'scene':
        if (sceneStep > 0) setSceneStep(sceneStep - 1);
        else setPhase('entry');
        break;
      case 'cope': setSceneStep(3); setPhase('scene'); break;
      case 'describe':
        if (copeShown) setPhase('cope');
        else { setSceneStep(3); setPhase('scene'); }
        break;
      case 'express': setPhase('describe'); break;
      case 'assert': setPhase('express'); break;
      case 'reinforce': setPhase('assert'); break;
      case 'mindful': setPhase('reinforce'); break;
      case 'confident': setPhase('mindful'); break;
      case 'negotiate': setPhase('confident'); break;
      case 'summary': setPhase('negotiate'); break;
    }
  };

  // ── Band gate helpers (A4-4) ──
  const sc = content.safetyCopy ?? {};
  // The picker and its safety route ship together (DearManSafetyCopy); without either, the older role chips.
  const routeCopy = PERSON_SAFETY_ROUTE_COPY.every(k => sc[k])
    ? { safetyRouteHeading: sc.safetyRouteHeading!, safetyRouteBody: sc.safetyRouteBody!, safetyRouteEnding: sc.safetyRouteEnding!, safetyRouteBack: sc.safetyRouteBack! }
    : null;
  const peopleCopy = routeCopy ? pickerCopy(sc as Record<string, string>) : null;
  const profileSettled = copeProfile.status !== 'loading';
  const hc = band.content?.handoff ?? null;

  const startPrep = () => {
    afterGate.current = { phase: 'scene', sceneStep: 0 };
    setGateForce(false);
    setPhase('check');
  };

  const goAfterGate = () => {
    const t = afterGate.current;
    setSceneStep(t.sceneStep);
    setPhase(t.phase);
  };


  /** P2 results ride on this visit's ToolSession (ext.er.handoffs, R18). */
  const recordHandoff = (r: HandoffResult) => {
    handoffs.current = [...handoffs.current, r];
    session.setExt({ er: { handoffs: handoffExt(handoffs.current) } });
  };
  const canDefer = session.persisted && Boolean(session.id);
  const resumeDraft = (step: DearManStep) => (canDefer ? { hostSessionId: session.id, stepId: dearManStepId(step), draft: draftOf() } : undefined);
  const scheduleLater = canDefer ? (chip: '1h' | 'evening' | 'tomorrow') => scheduleResumeLater('dear-man', session.id, chip) : undefined;
  const noteLine = resumeNote && resumeNote.phase === phase && hc
    ? <p className={secondaryText} data-testid="resume-note">{resumeNote.kind === 'resumed' ? hc.resumeLine : hc.resumeStale}</p>
    : null;

  const enterSummary = () => setPhase('summary');

  const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const carryCard = handoff && showCarry && sc.carriedOver ? (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
      <p className={`flex-1 ${secondaryText}`}>
        {fill(sc.carriedOver, { emotion: handoff.emotionName, need: lowerFirst(handoff.needLabel) })}
      </p>
      {sc.carriedOverDismiss && (
        <button type="button" onClick={() => setShowCarry(false)} className={linkButton}>
          {sc.carriedOverDismiss}
        </button>
      )}
    </div>
  ) : null;

  const BackButton = () => (
    <button
      onClick={goBack}
      className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
    >
      <span>&larr;</span>
      <span>Back</span>
    </button>
  );

  const SceneDots = () => (
    <div className="flex justify-center gap-2 mb-6">
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i === sceneStep
              ? 'bg-[var(--color-accent-fill)]'
              : i < sceneStep
                ? 'bg-[var(--color-accent-fill)] opacity-40'
                : 'bg-[var(--color-border)]'
          }`}
        />
      ))}
    </div>
  );

  const movePriority = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= priorities.length) return;
    const updated = [...priorities];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setPriorities(updated);
  };

  const removePriority = (id: string) => {
    if (priorities.length <= 1) return;
    setPriorities(prev => prev.filter(p => p !== id));
    setRemovedPriorities(prev => [...prev, id]);
  };

  const restorePriority = (id: string) => {
    setRemovedPriorities(prev => prev.filter(p => p !== id));
    setPriorities(prev => [...prev, id]);
  };

  const toggleChip = (id: string, selected: string[], setter: (v: string[]) => void) => {
    setter(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  // Barrier chips and the "What makes this hard?" text box stay in sync:
  // tapping a chip adds its text as a line (or removes it), and typing a
  // template's exact words lights up its chip.
  const barrierLabel = (id: string) => content.barriers.find(b => b.id === id)?.label ?? '';
  const toggleBarrier = (id: string) => {
    const label = barrierLabel(id);
    if (barriers.includes(id)) {
      setBarriers(barriers.filter(x => x !== id));
      setBarriersCustom(
        barriersCustom.split('\n').filter(line => line.trim() !== label).join('\n').trim()
      );
    } else {
      setBarriers([...barriers, id]);
      const base = barriersCustom.trimEnd();
      setBarriersCustom(base ? `${base}\n${label}` : label);
    }
  };
  const handleBarriersText = (text: string) => {
    setBarriersCustom(text);
    setBarriers(content.barriers.filter(b => b.label && text.includes(b.label)).map(b => b.id));
  };

  const getRelLabel = () =>
    (relationshipTypes.find(r => r.id === relationshipType)?.label ?? roleLabel(relationshipType))?.toLowerCase() ?? 'them';
  /** The plan's "with …": the name they gave, else "your {role}". */
  const withWhom = person?.label ? person.label : `your ${getRelLabel()}`;

  const getPriorityLabel = (id: string) =>
    priorityOptions.find(p => p.id === id)?.label ?? id;

  // Resolve an option ID to its label from a list
  const resolveLabel = (id: string | null, options: Array<{ id: string; label: string }>) =>
    options.find(o => o.id === id)?.label ?? '';

  // Resolve describe text for summary — the (possibly edited) text box wins
  const resolveDescribe = () => {
    if (describeCustom.trim()) return describeCustom.trim();
    if (describeId && situationType) {
      return resolveLabel(describeId, content.describeOptions[situationType] ?? []);
    }
    return '';
  };

  // Mirroring text for the Express step: option-specific, else situation-level fallback
  const resolveMirror = (): { text: string; feelingIds: string[] } | null => {
    if (!situationType) return null;
    const opt = describeId
      ? (content.describeOptions[situationType] ?? []).find(o => o.id === describeId)
      : undefined;
    if (opt?.mirrorText) return { text: opt.mirrorText, feelingIds: opt.typicalFeelingIds ?? [] };
    const sit = content.situationTypes.find(st => st.id === situationType);
    if (sit?.mirrorText) return { text: sit.mirrorText, feelingIds: sit.typicalFeelingIds ?? [] };
    return null;
  };

  // Resolve selected feelings for summary
  const resolveFeelings = () => {
    const labels = feelings.map(id => feelingLabel(id, content.feelingChips, partsHurts)).filter(Boolean);
    if (feelingCustom.trim()) labels.push(feelingCustom.trim());
    return labels;
  };

  // Resolve every selected assert (with elaboration) for the summary
  const resolveAsserts = (): string[] => {
    const options = situationType ? (content.assertOptions[situationType] ?? []) : [];
    const out: string[] = [];
    for (const id of assertIds) {
      const opt = options.find(o => o.id === id);
      if (!opt) continue;
      const detail = (assertDetails[id] ?? '').trim();
      if (opt.hasPlaceholder && detail) {
        out.push(opt.label.replace(/\[.*?\]/g, detail));
      } else if (detail) {
        out.push(`${opt.label} — ${detail}`);
      } else {
        out.push(opt.label);
      }
    }
    if (assertCustom.trim()) out.push(assertCustom.trim());
    return out;
  };

  // Resolve selected reinforcements for summary
  const resolveReinforce = () => {
    const labels = reinforceIds.map(id => resolveLabel(id, content.reinforceOptions)).filter(Boolean);
    if (reinforceCustom.trim()) labels.push(reinforceCustom.trim());
    return labels;
  };

  const resolveMiddleGround = () =>
    middleGroundId ? resolveLabel(middleGroundId, content.negotiateOptions.middleGround) : middleGroundCustom;

  const resolveWalkAway = () =>
    walkAwayId ? resolveLabel(walkAwayId, content.negotiateOptions.walkAway) : walkAwayCustom;

  // Can continue from describe?
  const hasDescribe = describeId != null || describeCustom.trim().length > 0;
  // Can continue from express?
  const hasExpress = feelings.length > 0 || feelingCustom.trim().length > 0;
  // Can continue from assert? Every selected fill-in-the-blank option needs its blank filled.
  const assertOptionsForSituation = situationType ? (content.assertOptions[situationType] ?? []) : [];
  const assertBlankMissing = assertIds.some(id => {
    const opt = assertOptionsForSituation.find(o => o.id === id);
    return opt?.hasPlaceholder && !(assertDetails[id] ?? '').trim();
  });
  const hasAssert = !assertBlankMissing && (assertIds.length > 0 || assertCustom.trim().length > 0);

  // Anchor phrases ranked by how well they match the barriers the user named
  const barrierOverlap = (ids: string[] | undefined) =>
    (ids ?? []).filter(id => barriers.includes(id)).length;
  const rankedAnchorPhrases = [...content.anchorPhrases].sort(
    (a, b) => barrierOverlap(b.barrierIds) - barrierOverlap(a.barrierIds)
  );
  const rankedAnchorNeeds = [...(content.anchorNeeds ?? [])].sort(
    (a, b) => barrierOverlap(b.barrierIds) - barrierOverlap(a.barrierIds)
  );
  const phrasesForNeed = (needId: string) =>
    rankedAnchorPhrases.filter(p => (p.needIds ?? []).includes(needId));
  // Can continue from reinforce?
  const hasReinforce = reinforceIds.length > 0 || reinforceCustom.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      const savedId = await saveDearManSession({
        type: 'prep',
        relationshipType: relationshipType || '',
        situationType: situationType || '',
        personId: person?.personId ?? null,
        priorities,
        barriers,
        barriersCustom,
        describeId,
        describeCustom,
        feelings,
        assertId: assertIds[0] ?? null,
        assertIds,
        assertDetails,
        assertCustom,
        reinforceIds,
        anchorPhrase,
        middleGroundId,
        middleGroundCustom,
        walkAwayId,
        walkAwayCustom,
      });
      setSaved(true);
      // PR-S4: the visit is a rep of `request`, linked to its DearManSession.
      if (savedId) void session.close({ status: 'completed', detail: { kind: 'dear_man', id: savedId }, repSource: dearManRepSource('prep') });
    } catch (err) {
      console.error('Failed to save DEAR MAN session:', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPhase('entry');
    setSceneStep(0);
    setRelationshipType(null);
    setSituationType(null);
    setPriorities(priorityOptions.map(p => p.id));
    setRemovedPriorities([]);
    setBarriers([]); setBarriersCustom('');
    setDescribeId(null); setDescribeCustom('');
    setFeelings([]); setFeelingCustom(''); setShowFeelingCustom(false); setShowMirror(false);
    setAssertIds([]); setAssertDetails({}); setAssertCustom(''); setShowAssertCustom(false);
    setReinforceIds([]); setReinforceCustom(''); setShowReinforceCustom(false);
    setAnchorPhrase(''); setShowAnchorGen(false); setAnchorNeedId(null); setAnchorShowAll(false);
    setMiddleGroundId(null); setMiddleGroundCustom(''); setShowMiddleGroundCustom(false);
    setWalkAwayId(null); setWalkAwayCustom(''); setShowWalkAwayCustom(false);
    setCopeAheadPartId(null); session.setExt(copeExt(null));
    setPerson(null); setPickerKey(k => k + 1);
    setSaved(false); setSaveError(false);
    setHandoff(null); setShowCarry(true);
    setBandReading(null); setGateForce(false); setResumeNote(null);
    afterGate.current = { phase: 'scene', sceneStep: 0 };
    setHeadsUp('offer');
  };

  // Every phase renders from here; "This is too much right now" sits under the plan steps (an
  // overlay: the step stays mounted underneath and the user comes back to it).
  const renderPhase = (): React.ReactNode => {
    // ─── ENTRY ───
    if (phase === 'entry') {
      return (
        <div className="space-y-4">
          {noteLine}
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            What brings you here?
          </h3>
          <button
            onClick={startPrep}
            className="w-full text-left p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-accent)] cursor-pointer transition-colors"
          >
            <p className="font-medium text-[var(--color-text-primary)]">
              I have a conversation coming up
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              and I want to prepare
            </p>
          </button>
          <button
            onClick={() => navigate('/tool/dear-man?mode=debrief')}
            className="w-full text-left p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-accent)] cursor-pointer transition-colors"
          >
            <p className="font-medium text-[var(--color-text-primary)]">
              I just had a conversation
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              and want to think through it
            </p>
          </button>
        </div>
      );
    }

    // ─── 'check' is a pass-through now (no band question in DEAR MAN; see the effect at the top) ───
    if (phase === 'check') return null;

    // ─── P2: body first, then back to the same step ───
    if (phase === 'handoff' && bandReading) {
      return (
        <div className="space-y-6">
          <BackButton />
          <BreakdownHandoff host="dear-man" band={bandReading.value} blank={false}
            resume={resumeDraft(afterGate.current)} onScheduleLater={scheduleLater}
            onResume={(r) => {
              recordHandoff(r);
              // "Picking up where we were." only when there is something to pick up (a resumed draft
              // or a later step), not on the first screen of a plan that hadn't started.
              const t = afterGate.current;
              if (resumed?.token || t.phase !== 'scene' || t.sceneStep > 0) setResumeNote({ kind: 'resumed', phase: t.phase });
              goAfterGate();
            }}
            onLater={recordHandoff} />
        </div>
      );
    }

    // ─── SAFETY ROUTE (IE-03 + D4): someone who might hurt or control them, or *rather not say* ───
    if (phase === 'person-safety' && routeCopy) {
      return (
        <PersonSafetyRoute copy={routeCopy} label={person?.label ?? null}
          onBack={() => { setPerson(null); setRelationshipType(null); setPickerKey(k => k + 1); setSceneStep(0); setPhase('scene'); }} />
      );
    }

    // ─── SCENE ───
    if (phase === 'scene') {
      return (
        <div className="space-y-6">
          {carryCard}
          {noteLine}
          {sceneStep > 0 && <BackButton />}
          <SceneDots />

          {/* Sub-step 0: Who it's with, and is it safe (IE-03 + D4). The older role chips stay for a graph without the copy. */}
          {sceneStep === 0 && peopleCopy && profileSettled && (
            <PersonPicker key={pickerKey} people={answeredPeople ?? copeProfile.slices?.people ?? null} signedIn={copeProfile.status !== 'signed-out' && copeProfile.status !== 'error'}
              copy={peopleCopy}
              onDone={(p) => {
                setAnsweredPeople(withAnswer(answeredPeople ?? copeProfile.slices?.people ?? null, p, new Date().toISOString()));
                setPerson(p);
                setRelationshipType(p.role);
                if (p.route === 'safety') setPhase('person-safety');
                else setSceneStep(1);
              }} />
          )}
          {sceneStep === 0 && peopleCopy && !profileSettled && (
            <div className="h-24 animate-pulse rounded-xl bg-[var(--color-bg-card)]" aria-hidden="true" />
          )}
          {sceneStep === 0 && !peopleCopy && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Who is this conversation with?
              </h3>
              <div className="flex flex-wrap gap-2">
                {relationshipTypes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRelationshipType(r.id); setSceneStep(1); }}
                    className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                      relationshipType === r.id
                        ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-step 1: Situation type (from graph) */}
          {sceneStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                What kind of conversation is this?
              </h3>
              {person?.route === 'heads_up' && sc.badlyHeadsUp && (
                <p className={`${secondaryText} p-3 rounded-xl bg-[var(--color-bg-secondary)]`} data-testid="person-heads-up">{sc.badlyHeadsUp}</p>
              )}
              <div className="space-y-3">
                {content.situationTypes.map(st => (
                  <button
                    key={st.id}
                    onClick={() => { setSituationType(st.id); setSceneStep(2); }}
                    className={`w-full text-left p-4 rounded-xl border cursor-pointer transition-colors ${
                      situationType === st.id
                        ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent'
                        : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-accent)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl" role="img" aria-hidden="true">{st.emoji}</span>
                      <div>
                        <p className={`font-medium ${situationType === st.id ? 'text-[var(--color-on-accent)]' : 'text-[var(--color-text-primary)]'}`}>
                          {st.label}
                        </p>
                        <p className={`text-sm mt-0.5 ${situationType === st.id ? 'text-[var(--color-on-accent)] opacity-80' : 'text-[var(--color-text-secondary)]'}`}>
                          {st.sublabel}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-step 2: Priorities */}
          {sceneStep === 2 && (
            <div className="space-y-4">
              {/* IE-B2: a refused ask to be heard by them, counted by the debrief: Let go (FAST), offered once more. */}
              {offerLetGo(keptPerson, situationType) && sc.letGoLine && sc.letGoLink && (
                <div className="p-3 rounded-xl bg-[var(--color-bg-secondary)] space-y-2" data-testid="person-let-go">
                  <p className={secondaryText}>{fillWho(sc.letGoLine, person?.label)}</p>
                  <button type="button" onClick={() => navigate('/tool/fast?frame=let_go')} className={linkButton}>{sc.letGoLink}</button>
                </div>
              )}
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                What matters most to you here?
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Rank in order of importance &mdash; or remove any that don&apos;t apply.
              </p>
              <div className="space-y-2">
                {priorities.map((id, index) => (
                  <div key={id} className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
                    <span className="text-sm font-medium text-[var(--color-text-tertiary)] w-5">{index + 1}.</span>
                    <span className="flex-1 text-[var(--color-text-primary)]">{getPriorityLabel(id)}</span>
                    <button onClick={() => movePriority(index, -1)} disabled={index === 0}
                      className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-30">&uarr;</button>
                    <button onClick={() => movePriority(index, 1)} disabled={index === priorities.length - 1}
                      className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-30">&darr;</button>
                    <button onClick={() => removePriority(id)} disabled={priorities.length <= 1}
                      className="w-8 h-8 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-30">&times;</button>
                  </div>
                ))}
              </div>
              {removedPriorities.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Not a priority here</p>
                  <div className="flex flex-wrap gap-2">
                    {removedPriorities.map(id => (
                      <button key={id} onClick={() => restorePriority(id)}
                        className="px-3 py-1.5 text-sm rounded-full border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                        + {getPriorityLabel(id)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-[var(--color-text-muted)]">
                There&apos;s no wrong answer. This helps us focus advice on what you&apos;d protect if the conversation gets tough.
              </p>
              <button onClick={() => setSceneStep(3)} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">Next</button>
            </div>
          )}

          {/* Sub-step 3: Barriers — free text first, curated options as a starting point */}
          {sceneStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What makes this hard?</h3>
              <textarea rows={3} value={barriersCustom}
                onChange={e => handleBarriersText(e.target.value)}
                placeholder="Type your answer…"
                className={textareaClass} />
              <p className="text-sm text-[var(--color-text-secondary)]">Or, start with a template / select options:</p>
              <div className="flex flex-wrap gap-2">
                {content.barriers.map(b => {
                  const selected = barriers.includes(b.id);
                  return (
                    <button key={b.id}
                      onClick={() => toggleBarrier(b.id)}
                      aria-pressed={selected}
                      className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                        selected ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                      }`}>
                      {b.label}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPhase(copeShown ? 'cope' : 'describe')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">
                {copeShown ? 'Next' : <>Let&apos;s build your script</>}
              </button>
            </div>
          )}
        </div>
      );
    }

    // ─── COPE AHEAD (parts on): who might show up, while the plan is made and before the script ───
    if (phase === 'cope') {
      if (!copeShown || !copeCopy || !copeSlices) return null;
      return (
        <div className="space-y-6">
          {noteLine}
          <BackButton />
          <CopeAheadStep content={copeCopy} parts={copeParts(copeSlices.parts)} anchors={copeAnchorMap} lines={copeLines}
            picked={copeAheadPartId} onPick={pickCopePart}
            onAnchor={(partId, text, version) => {
              setCopeAnchors(a => ({ ...a, [partId]: text }));
              profileCache.bump(version);
            }}
            onGoOn={() => handBack('describe')} />
          {copeAheadPartId && (
            <button onClick={() => handBack('describe')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">
              Let&apos;s build your script
            </button>
          )}
        </div>
      );
    }

    // ─── DESCRIBE ───
    if (phase === 'describe') {
      const options = situationType ? (content.describeOptions[situationType] ?? []) : [];
      return (
        <div className="space-y-6">
          <BackButton />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What happened?</h3>
          <textarea rows={3} value={describeCustom}
            onChange={e => setDescribeCustom(e.target.value)}
            placeholder="Type or answer… just the facts, like a camera would see it."
            className={textareaClass} />
          <p className="text-[var(--color-text-secondary)]">Or, start with a template / pick the one that fits best:</p>
          <div className="space-y-2">
            {options.map(opt => (
              <button key={opt.id}
                onClick={() => { setDescribeId(opt.id); setDescribeCustom(opt.label); }}
                aria-pressed={describeId === opt.id}
                className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                  describeId === opt.id
                    ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-[var(--color-on-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          {describeId && (
            <p className="text-sm text-[var(--color-text-tertiary)]">
              That&apos;s in the box above &mdash; edit it until it sounds like your situation.
            </p>
          )}
          <button onClick={() => setPhase('express')} disabled={!hasDescribe}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50">
            Next: How you feel
          </button>
          {!hasDescribe && <p className="text-sm text-center text-[var(--color-text-tertiary)]">Write a line above, or pick a template, to continue.</p>}
          {content.stepInsights.describe && (
            <p className="text-sm text-[var(--color-text-tertiary)] italic">{content.stepInsights.describe}</p>
          )}
        </div>
      );
    }

    // ─── EXPRESS ───
    if (phase === 'express') {
      const mirror = resolveMirror();
      const groups = content.feelingGroups ?? [];
      // Group chips by their graph-assigned group; anything unassigned goes in a trailing "Other" bucket
      const grouped: Array<{ id: string; label: string; color: string; chips: typeof content.feelingChips }> = groups.map(g => ({
        id: g.id,
        label: g.label,
        color: feelingGroupColors[g.colorKey] ?? feelingGroupColors.neutral,
        chips: content.feelingChips.filter(f => f.groupId === g.id),
      })).filter(g => g.chips.length > 0);
      const ungrouped = content.feelingChips.filter(f => !f.groupId || !groups.some(g => g.id === f.groupId));
      if (ungrouped.length) {
        grouped.push({ id: 'other', label: grouped.length ? 'Other' : '', color: feelingGroupColors.neutral, chips: ungrouped });
      }
      const typicalChips = mirror
        ? mirror.feelingIds.map(id => content.feelingChips.find(f => f.id === id)).filter((f): f is typeof content.feelingChips[number] => f != null)
        : [];
      const colorFor = (chip: typeof content.feelingChips[number]) =>
        grouped.find(g => g.chips.includes(chip))?.color ?? feelingGroupColors.neutral;

      // Plain render helper (not a component) so chips don't remount on every state change
      const renderFeelingChip = (chip: typeof content.feelingChips[number], color: string) => {
        const selected = feelings.includes(chip.id);
        return (
          <button
            key={chip.id}
            onClick={() => toggleChip(chip.id, feelings, setFeelings)}
            aria-pressed={selected}
            style={selected
              ? { backgroundColor: color, borderColor: 'transparent', color: '#fff' }
              : { backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
            className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
              selected ? '' : 'text-[var(--color-text-primary)] hover:brightness-95'
            }`}>
            {chip.label}
          </button>
        );
      };

      return (
        <div className="space-y-6">
          {carryCard}
          <BackButton />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">How does this make you feel?</h3>
          <p className="text-[var(--color-text-secondary)]">Tap all that apply.</p>

          {/* The hurt named in Recover, first and not selected: its words alone */}
          {hurtChip && (
            <div className="flex flex-wrap gap-2">
              {renderFeelingChip({ id: hurtChip.id, label: hurtChip.label }, feelingGroupColors.neutral)}
            </div>
          )}

          {/* Mirroring — an example of what this situation typically brings up */}
          {mirror && (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
              <button
                onClick={() => setShowMirror(v => !v)}
                aria-expanded={showMirror}
                className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
                {showMirror ? '−' : '+'} Not sure? See how this might typically make someone feel
              </button>
              {showMirror && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{mirror.text}</p>
                  {typicalChips.length > 0 && (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">Sound familiar? Tap any that fit</p>
                      <div className="flex flex-wrap gap-2">
                        {typicalChips.map(chip => renderFeelingChip(chip, colorFor(chip)))}
                      </div>
                      <button
                        onClick={() => setFeelings(prev => Array.from(new Set([...prev, ...typicalChips.map(c => c.id)])))}
                        className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                        + Add all of these
                      </button>
                    </>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)]">This is what many people feel here &mdash; not what you&apos;re supposed to feel. Only keep what&apos;s true for you.</p>
                </div>
              )}
            </div>
          )}

          {/* Color-coded feeling groups */}
          <div className="space-y-4">
            {grouped.map(g => (
              <div key={g.id} className="space-y-2">
                {g.label && (
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                    <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.label}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {g.chips.map(chip => renderFeelingChip(chip, g.color))}
                </div>
              </div>
            ))}
          </div>

          {!showFeelingCustom ? (
            <button onClick={() => setShowFeelingCustom(true)}
              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
              + Something else
            </button>
          ) : (
            <input type="text" value={feelingCustom}
              onChange={e => setFeelingCustom(e.target.value)}
              placeholder="I also feel..."
              autoFocus
              className={inputClass} />
          )}
          <button onClick={() => setPhase('assert')} disabled={!hasExpress}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50">
            Next: What you need
          </button>
          {!hasExpress && <p className="text-sm text-center text-[var(--color-text-tertiary)]">Tap at least one feeling to continue.</p>}
          {content.stepInsights.express && (
            <p className="text-sm text-[var(--color-text-tertiary)] italic">{content.stepInsights.express}</p>
          )}
        </div>
      );
    }

    // ─── ASSERT ───
    if (phase === 'assert') {
      const options = assertOptionsForSituation;
      return (
        <div className="space-y-6">
          <BackButton />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            What specifically are you asking for &mdash; or saying no to?
          </h3>
          <p className="text-[var(--color-text-secondary)]">Pick any that apply. You can add detail to each one.</p>

          {/* Barrier-specific coaching for guilty */}
          {barriers.includes('barrier_guilty') && content.assertBarrierGuilty && (
            <div className="bg-[var(--color-accent-muted)] rounded-lg p-3 text-sm text-[var(--color-text-secondary)]">
              {content.assertBarrierGuilty}
            </div>
          )}

          <div className="space-y-2">
            {options.map(opt => {
              const selected = assertIds.includes(opt.id);
              const detail = assertDetails[opt.id] ?? '';
              const prompt = opt.hasPlaceholder
                ? 'Fill in the blank:'
                : (opt.elaboratePrompt || 'Want to add more detail? (optional)');
              return (
                <div key={opt.id} className={`rounded-lg border transition-colors ${
                  selected ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]' : 'border-[var(--color-border)]'
                }`}>
                  <button
                    onClick={() => toggleChip(opt.id, assertIds, setAssertIds)}
                    aria-pressed={selected}
                    className={`w-full text-left py-3 px-4 rounded-lg transition-colors ${
                      selected ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)] lift-secondary'
                    }`}>
                    <span className="flex items-start gap-3">
                      <span aria-hidden="true" className={`mt-0.5 inline-flex w-5 h-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                        selected ? 'bg-[var(--color-accent-fill)] border-transparent text-[var(--color-on-accent)]' : 'border-[var(--color-border)]'
                      }`}>{selected ? '✓' : ''}</span>
                      <span>{opt.label}</span>
                    </span>
                  </button>
                  {selected && (
                    <div className="px-4 pb-3 space-y-1.5">
                      <label htmlFor={`assert-detail-${opt.id}`} className="block text-sm text-[var(--color-text-secondary)]">
                        {prompt}
                      </label>
                      <textarea
                        id={`assert-detail-${opt.id}`}
                        rows={2}
                        value={detail}
                        onChange={e => setAssertDetails(prev => ({ ...prev, [opt.id]: e.target.value }))}
                        placeholder={opt.hasPlaceholder ? 'Be specific...' : 'In your own words...'}
                        className={textareaClass}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!showAssertCustom ? (
            <button onClick={() => setShowAssertCustom(true)}
              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
              + Something else &mdash; I&apos;ll say it myself
            </button>
          ) : (
            <textarea rows={3} value={assertCustom}
              onChange={e => setAssertCustom(e.target.value)}
              placeholder="What are you asking for?"
              autoFocus
              className={textareaClass} />
          )}

          <button onClick={() => setPhase('reinforce')} disabled={!hasAssert}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50">
            Next: Why it matters
          </button>
          {!hasAssert && (
            <p className="text-sm text-center text-[var(--color-text-tertiary)]">
              {assertBlankMissing ? 'Fill in the blank on what you selected to continue.' : 'Choose at least one thing you’re asking for to continue.'}
            </p>
          )}
          {content.stepInsights.assert && (
            <p className="text-sm text-[var(--color-text-tertiary)] italic">{content.stepInsights.assert}</p>
          )}
        </div>
      );
    }

    // ─── REINFORCE ───
    if (phase === 'reinforce') {
      return (
        <div className="space-y-6">
          <BackButton />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            What&apos;s in it for them &mdash; or for the relationship &mdash; if this goes well?
          </h3>
          <div className="flex flex-wrap gap-2">
            {content.reinforceOptions.map(r => {
              const selected = reinforceIds.includes(r.id);
              return (
                <button key={r.id}
                  onClick={() => toggleChip(r.id, reinforceIds, setReinforceIds)}
                  className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                    selected ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                  }`}>
                  {r.label}
                </button>
              );
            })}
          </div>
          {!showReinforceCustom ? (
            <button onClick={() => setShowReinforceCustom(true)}
              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
              + Something else
            </button>
          ) : (
            <input type="text" value={reinforceCustom}
              onChange={e => setReinforceCustom(e.target.value)}
              placeholder="Why it would help..."
              autoFocus
              className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
          )}
          <button onClick={() => setPhase('mindful')} disabled={!hasReinforce}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50">
            Next: Getting ready
          </button>
          {!hasReinforce && <p className="text-sm text-center text-[var(--color-text-tertiary)]">Pick at least one reason to continue.</p>}
          {content.stepInsights.reinforce && (
            <p className="text-sm text-[var(--color-text-tertiary)] italic">{content.stepInsights.reinforce}</p>
          )}
        </div>
      );
    }

    // ─── MINDFUL ───
    if (phase === 'mindful') {
      const coachingCards = barriers.length > 0
        ? barriers
            .filter(b => content.barrierCoaching[b])
            .slice(0, 3)
            .map(b => content.barrierCoaching[b])
        : [content.defaultCoaching];

      return (
        <div className="space-y-6">
          <BackButton />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What might pull you off track?</h3>
          {coachingCards.map((card, i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
              <p className="font-medium text-[var(--color-text-primary)] mb-1">{card.title}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{card.body}</p>
            </div>
          ))}
          <div className="space-y-3">
            <p className="text-[var(--color-text-secondary)]">What&apos;s one thing you can tell yourself if it gets hard?</p>
            <input type="text" value={anchorPhrase}
              onChange={e => setAnchorPhrase(e.target.value)}
              placeholder="Your anchor phrase"
              className={inputClass} />
            {anchorPhrase && content.anchorGeneratorMakeItYours && (
              <p className="text-xs text-[var(--color-text-muted)]">{content.anchorGeneratorMakeItYours}</p>
            )}

            {/* Quick picks: ranked by how well they match the barriers named earlier */}
            <p className="text-sm text-[var(--color-text-muted)]">Or pick one:</p>
            <div className="flex flex-wrap gap-2">
              {rankedAnchorPhrases.slice(0, 6).map(a => (
                <button key={a.id} onClick={() => setAnchorPhrase(a.label)}
                  aria-pressed={anchorPhrase === a.label}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    anchorPhrase === a.label
                      ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)]'
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>

            {/* Anchor phrase generator — inline sub-panel */}
            {rankedAnchorNeeds.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)]">
                <button
                  onClick={() => setShowAnchorGen(v => !v)}
                  aria-expanded={showAnchorGen}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors">
                  {showAnchorGen ? '\u2212' : '+'} Help me find my phrase
                </button>
                {showAnchorGen && (
                  <div className="px-4 pb-4 space-y-4">
                    {content.anchorGeneratorIntro && (
                      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{content.anchorGeneratorIntro}</p>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">When it gets hard, what do you most need to hear?</p>
                      <div className="flex flex-wrap gap-2">
                        {rankedAnchorNeeds.map(n => {
                          const suggested = barrierOverlap(n.barrierIds) > 0;
                          const selected = anchorNeedId === n.id;
                          return (
                            <button key={n.id}
                              onClick={() => { setAnchorNeedId(n.id); setAnchorShowAll(false); }}
                              aria-pressed={selected}
                              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                                selected
                                  ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent'
                                  : suggested
                                    ? 'border-[var(--color-accent)] text-[var(--color-text-primary)] bg-[var(--color-accent-subtle)]'
                                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)]'
                              }`}>
                              {n.label}{suggested && !selected ? ' \u00b7 fits what you said' : ''}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {anchorNeedId && (() => {
                      const matches = phrasesForNeed(anchorNeedId);
                      const shown = anchorShowAll ? matches : matches.slice(0, 4);
                      return (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">Try one of these. Tap to use it, then edit it until it sounds like you.</p>
                          {shown.length === 0 && (
                            <p className="text-sm text-[var(--color-text-tertiary)]">Nothing matched yet &mdash; try another need, or write your own above.</p>
                          )}
                          <div className="space-y-2">
                            {shown.map(pz => (
                              <button key={pz.id}
                                onClick={() => { setAnchorPhrase(pz.label); setShowAnchorGen(false); }}
                                className="w-full text-left py-3 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] lift-secondary hover:border-[var(--color-accent)] transition-colors">
                                &ldquo;{pz.label}&rdquo;
                              </button>
                            ))}
                          </div>
                          {!anchorShowAll && matches.length > shown.length && (
                            <button onClick={() => setAnchorShowAll(true)}
                              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                              + Show {matches.length - shown.length} more
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setPhase('confident')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">
            Almost there
          </button>
        </div>
      );
    }

    // ─── CONFIDENT ───
    if (phase === 'confident') {
      return (
        <div className="space-y-6">
          <BackButton />
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">Before the conversation</h3>
            <p className="text-[var(--color-text-secondary)]">{content.confidentCoaching}</p>
            {barriers.includes('barrier_no_right') && content.confidentBarrierNoRight && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-3 italic">{content.confidentBarrierNoRight}</p>
            )}
          </div>
          <button onClick={() => setPhase('negotiate')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">
            Last step
          </button>
        </div>
      );
    }

    // ─── NEGOTIATE ───
    if (phase === 'negotiate') {
      const topPriority = priorities[0];
      const hint = topPriority ? content.negotiateHints[topPriority] : null;

      return (
        <div className="space-y-6">
          <BackButton />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">If they say no &mdash; or push back</h3>
          <div className="p-3 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)]">
            Negotiating doesn&apos;t mean caving. It means being willing to find a solution that works for both of you &mdash; without giving up what matters most.
          </div>
          {hint && <p className="text-sm text-[var(--color-text-secondary)] italic">{hint}</p>}

          {/* Middle ground */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">What&apos;s a middle ground you could live with?</p>
            <div className="space-y-2">
              {content.negotiateOptions.middleGround.map(opt => (
                <button key={opt.id}
                  onClick={() => { setMiddleGroundId(opt.id); setShowMiddleGroundCustom(false); setMiddleGroundCustom(''); }}
                  className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                    middleGroundId === opt.id
                      ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-[var(--color-on-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {!showMiddleGroundCustom ? (
              <button onClick={() => { setShowMiddleGroundCustom(true); setMiddleGroundId(null); }}
                className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                + Something else
              </button>
            ) : (
              <input type="text" value={middleGroundCustom}
                onChange={e => setMiddleGroundCustom(e.target.value)}
                placeholder="A compromise I could accept..."
                autoFocus
                className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
            )}
          </div>

          {/* Walk-away */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">What won&apos;t you compromise on?</p>
            <div className="space-y-2">
              {content.negotiateOptions.walkAway.map(opt => (
                <button key={opt.id}
                  onClick={() => { setWalkAwayId(opt.id); setShowWalkAwayCustom(false); setWalkAwayCustom(''); }}
                  className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                    walkAwayId === opt.id
                      ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-[var(--color-on-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {!showWalkAwayCustom ? (
              <button onClick={() => { setShowWalkAwayCustom(true); setWalkAwayId(null); }}
                className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                + Something else
              </button>
            ) : (
              <input type="text" value={walkAwayCustom}
                onChange={e => setWalkAwayCustom(e.target.value)}
                placeholder="My non-negotiable..."
                autoFocus
                className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
            )}
          </div>

          <button onClick={enterSummary} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">
            See your plan
          </button>
        </div>
      );
    }

    // ─── SUMMARY ───
    if (phase === 'summary') {
      const describeText = resolveDescribe();
      const feelingsText = resolveFeelings();
      const assertTexts = resolveAsserts();
      const reinforceTexts = resolveReinforce();
      const mgText = resolveMiddleGround();
      const waText = resolveWalkAway();
      const lastReread = [...handoffs.current].reverse().find(r => r.thenVsNow)?.thenVsNow ?? null;
      const hot = summaryHeadsUpForBand(bandReading?.value, lastReread) && Boolean(sc.hotHeading);
      // The heads-up's breath is P2's sigh primitive (graph HandoffPrimitive copy), not Recover's gates.
      const sigh = band.content?.primitives.find(p => p.id === 'sigh')?.copy as
        { title: string; sub: string; phases: BreathPhase[]; cycles: number; start: string; skip: string; done: string } | undefined;
      const b = sigh && Array.isArray(sigh.phases) ? sigh : undefined;

      return (
        <div className="space-y-6">
          <BackButton />
          {carryCard}
          {hot && headsUp !== 'dismissed' && (
            <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-3" role="note">
              {headsUp === 'cooled' ? (
                <p className="text-[var(--color-text-primary)]">{sc.hotCooled}</p>
              ) : (
                <>
                  <p className="font-semibold text-[var(--color-text-primary)]">{sc.hotHeading}</p>
                  <p className={secondaryText}>{sc.hotBody}</p>
                  {headsUp === 'breathing' && b ? (
                    <LazyMotion features={domAnimation}>
                      <BreathOrb phases={b.phases} cycles={b.cycles} compact
                        startLabel={fill(b.start, { seconds: Math.round(b.cycles * b.phases.reduce((t, p) => t + p.ms, 0) / 1000) })}
                        skipLabel={b.skip} doneLabel={b.done}
                        onDone={done => setHeadsUp(done ? 'cooled' : 'dismissed')} />
                    </LazyMotion>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {b && (
                        <button type="button" onClick={() => setHeadsUp('breathing')}
                          className="py-2.5 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">
                          {sc.hotCoolDown}
                        </button>
                      )}
                      <button type="button" onClick={() => setHeadsUp('dismissed')} className={linkButton}>{sc.hotReady}</button>
                    </div>
                  )}
                  {sc.hotBodyCue && <p className={secondaryText}>{sc.hotBodyCue}</p>}
                </>
              )}
            </div>
          )}
          {handoff?.oneMessageOnly && sc.oneMessageOnly && (
            <p className={`${secondaryText} p-3 rounded-xl bg-[var(--color-bg-secondary)]`}>{sc.oneMessageOnly}</p>
          )}
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Your Conversation Plan</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">with {withWhom}</p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">The Situation</p>
              <p className="text-[var(--color-text-primary)]">{describeText}</p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">How I Feel</p>
              <p className="text-[var(--color-text-primary)]">{feelingsText.join(', ')}</p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">What I&apos;m Asking For</p>
              {assertTexts.length === 1
                ? <p className="text-[var(--color-text-primary)]">{assertTexts[0]}</p>
                : (
                  <ul className="list-disc pl-5 space-y-1">
                    {assertTexts.map((t, i) => <li key={i} className="text-[var(--color-text-primary)]">{t}</li>)}
                  </ul>
                )}
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Why It Matters</p>
              {reinforceTexts.map((t, i) => <p key={i} className="text-[var(--color-text-primary)]">{t}</p>)}
            </div>

            {copeCarry && (
              <div className="mb-6" data-testid="cope-carry">
                <p className="text-sm text-[var(--color-text-secondary)]">{copeCarry.lead}</p>
                <p className="font-serif text-[var(--color-text-primary)] break-words">{copeCarry.anchor}</p>
              </div>
            )}

            <hr className="border-[var(--color-border-subtle)] mb-6" />

            {anchorPhrase && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">My Anchor</p>
                <p className="text-[var(--color-text-primary)] italic">&ldquo;{anchorPhrase}&rdquo;</p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">If They Push Back</p>
              {mgText && <p className="text-[var(--color-text-primary)]"><span className="text-[var(--color-text-secondary)]">Middle ground:</span> {mgText}</p>}
              {waText && <p className="text-[var(--color-text-primary)]"><span className="text-[var(--color-text-secondary)]">I won&apos;t compromise on:</span> {waText}</p>}
            </div>

            {(content.confidenceCues?.length ?? 0) > 0 && (
              <div className="mb-6" data-testid="confidence-cues">
                <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Body Reminder</p>
                <ul className="text-[var(--color-text-secondary)] text-sm space-y-0.5">
                  {content.confidenceCues!.map(c => <li key={c.id}>{c.label}</li>)}
                </ul>
              </div>
            )}

            <hr className="border-[var(--color-border-subtle)] mb-6" />

            <div className="flex gap-3">
              <button onClick={handleSave} disabled={saving || saved}
                className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary disabled:opacity-50">
                {saved ? 'Saved' : saving ? 'Saving...' : saveError ? 'Try again' : 'Save this plan'}
              </button>
              <button onClick={reset}
                className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary">
                Start over
              </button>
            </div>
            {saveError && (
              <p role="alert" className="text-[var(--color-danger)] text-sm mt-2 text-center">Your plan couldn't be saved. It's still here on this screen — you can try again.</p>
            )}
            {saved && sc.askOutcomeQuestion && sc.askOutcomeSet && (
              <AskOutcome copy={sc} sessionId={session.id} />
            )}
            {saved && (
              <button
                onClick={() => navigate('/history', { state: { tab: 'dearman' } })}
                className="w-full mt-3 py-3 px-4 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] font-medium lift-secondary hover:bg-[var(--color-accent-subtle)] transition-colors">
                See my plans &rarr;
              </button>
            )}
            {!saved && !saveError && (
              <p className="text-xs text-[var(--color-text-tertiary)] mt-3 text-center">
                Saving stores this plan with your account. Nothing is saved until you choose to.
              </p>
            )}
          </div>

          {/* DEAR MAN reveal */}
          {content.revealText && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
                <span className="group-open:hidden">+ By the way &mdash; you just used DEAR MAN.</span>
                <span className="hidden group-open:inline">&minus; By the way &mdash; you just used DEAR MAN.</span>
              </summary>
              <div className="mt-2 p-4 rounded-lg bg-[var(--color-bg-elevated)]/50 text-sm text-[var(--color-text-secondary)]">
                <p>{content.revealText}</p>
              </div>
            </details>
          )}

          {/* Cope Ahead: rehearse this conversation, with the part picked in prep carried in (parts on only). */}
          <CopeAheadEntryLink copyKey="entry_dear_man" situationId="conversation" partId={partsOn ? copeAheadPartId : null} />
          <button onClick={() => navigate(debriefLink(partsOn ? copeAheadPartId : null, person?.personId ?? null))}
            className="w-full min-h-11 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
            After the conversation &rarr; How did it go?
          </button>
        </div>
      );
    }

    return null;
  };

  const view = renderPhase();
  const planStep = (TOO_MUCH_PHASES as readonly string[]).includes(phase);
  return (
    <>
      <div ref={viewRoot}>{view}</div>
      {planStep && (
        <div className="mt-8 text-center">
          <TooMuchLink host="dear-man" onScheduleLater={scheduleLater} onResult={recordHandoff}
            resume={() => resumeDraft({ phase: phase as DearManStep['phase'], sceneStep })} />
        </div>
      )}
    </>
  );
}

/**
 * The saved plan's "When is the conversation?" (IE-B2): a chip schedules DEAR MAN's "How did it go?" (`ask_outcome`,
 * its window in schema/practice-spine.cypher) on this visit's ToolSession, so the card opens the debrief. One tap,
 * never required; nothing on the card names the person.
 */
function AskOutcome({ copy, sessionId }: { copy: NonNullable<DearManContentResult['safetyCopy']>; sessionId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'set' | 'failed'>('idle');
  const labels: Record<AskOutcomeChip, string | undefined> = {
    today: copy.askOutcomeToday, tomorrow: copy.askOutcomeTomorrow, this_week: copy.askOutcomeWeek, unsure: copy.askOutcomeUnsure,
  };
  const pick = async (chip: AskOutcomeChip) => {
    setState('busy');
    try {
      const spine = await getSpineContent();
      const type = spine.followUpTypes.find(t => t.id === 'ask_outcome' && t.enabled);
      const due = type ? dueAtFor(type.window, new Date(), chip) : null;
      if (!due) throw new Error('no window');
      await scheduleFollowUps([{ id: newId(), type: 'ask_outcome', dueAt: due.toISOString(), window: chip }],
        { sourceSessionId: sessionId, sourceToolId: 'dear-man' });
      setState('set');
    } catch {
      setState('failed');
    }
  };
  // The tapped chip goes with the row: focus lands on the line that replaces it.
  const setLine = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (state === 'set') focusLine(setLine.current); }, [state]);
  if (state === 'set') return <p ref={setLine} tabIndex={-1} className={`${secondaryText} mt-4 text-center focus:outline-none`} role="status">{copy.askOutcomeSet}</p>;
  if (ASK_OUTCOME_CHIPS.some(c => !labels[c])) return null;
  return (
    <div className="mt-4 space-y-2" data-testid="ask-outcome">
      <p className={secondaryText}>{copy.askOutcomeQuestion}</p>
      {state === 'failed' && <p role="status" className={secondaryText}>{copy.askOutcomeFailed ?? "That didn't save. You can try again."}</p>}
      <div className="flex flex-wrap gap-2" aria-busy={state === 'busy'}>
        {ASK_OUTCOME_CHIPS.map(c => (
          <button key={c} type="button" disabled={state === 'busy'} onClick={() => void pick(c)}
            className="min-h-11 px-4 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] lift-secondary disabled:opacity-50">
            {labels[c]}
          </button>
        ))}
      </div>
    </div>
  );
}
