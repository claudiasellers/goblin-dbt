import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDearManContent, saveDearManSession, getDearManDebriefContent, getDearManReflection, saveCheckIn, getStateAndTools } from '../../services/neo4j';
import type { DearManContentResult, DearManDebriefContentResult, DearManReflectionResult } from '../../data/dearManTypes';
import type { StateResult as StateResultType } from '../../services/neo4j';
import { getEmotionByName } from '../../data/emotions';
import { getToolById } from '../../data/tools';
import { ToolLoadError } from '../../components/tools/ToolLoadError';
import { ToolLoading } from '../../components/tools/ToolLoading';
import { LazyMotion, domAnimation } from 'motion/react';
import { isDearManHandoff, type DearManHandoff } from '../../data/dearManHandoff';
import { UrgeScale } from '../../components/tools/oppositeAction/UrgeScale';
import { BreathOrb } from '../../components/tools/regulation/body';
import { linkButton, secondaryText } from '../../components/tools/oppositeAction/styles';
import { fill } from '../../lib/invalidationRecovery';
import { handoffPrefill, nextAfterRating, summaryHeadsUp } from '../../lib/dearManSafety';

type Phase =
  | 'entry'
  | 'check'
  | 'scene'
  | 'describe'
  | 'express'
  | 'assert'
  | 'reinforce'
  | 'mindful'
  | 'confident'
  | 'negotiate'
  | 'summary'
  | 'debrief-checkin'
  | 'debrief-who'
  | 'debrief-overall'
  | 'debrief-moment'
  | 'debrief-response'
  | 'debrief-body'
  | 'debrief-thought'
  | 'debrief-underneath'
  | 'debrief-reflection'
  | 'debrief-cope-select'
  | 'debrief-rehearsal'
  | 'debrief-moment-plan'
  | 'debrief-route';

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

const debriefOverallOptions = [
  { id: 'better', label: 'Better than I expected' },
  { id: 'mixed', label: 'Mixed' },
  { id: 'not_well', label: "It didn't go well" },
  { id: 'didnt_have', label: "Didn't have it yet" },
];

export function DearMan() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { checkinEmotions?: string[]; dearManHandoff?: unknown } | null;
  const checkinEmotions = routeState?.checkinEmotions;
  // Handoff from "Recover from a hurtful moment": already-answered context, read once on mount.
  const routeHandoff = routeState?.dearManHandoff;
  const [handoff, setHandoff] = useState<DearManHandoff | null>(() => (isDearManHandoff(routeHandoff) ? routeHandoff : null));
  const initialHandoff = useRef(handoff);
  /** Captured once: the check-in hand-over only affects the first screen. */
  const cameFromCheckin = useRef(Boolean(checkinEmotions?.length));

  // ── Graph content (loaded once) ──
  const [content, setContent] = useState<DearManContentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>(handoff || checkinEmotions?.length ? 'scene' : 'entry');
  const [sceneStep, setSceneStep] = useState(0);

  // ── Scene data ──
  const [relationshipType, setRelationshipType] = useState<string | null>(null);
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

  // ── Debrief data ──
  const [debriefOverall, setDebriefOverall] = useState<string | null>(null);

  // ── Debrief chain analysis data ──
  const [debriefContent, setDebriefContent] = useState<DearManDebriefContentResult | null>(null);
  const [debriefCurrentFeelings, setDebriefCurrentFeelings] = useState<string[]>([]);
  const [debriefRelationshipType, setDebriefRelationshipType] = useState<string | null>(null);
  const [turningPointIds, setTurningPointIds] = useState<string[]>([]);
  const [momentResponseIds, setMomentResponseIds] = useState<string[]>([]);
  const [bodySignalIds, setBodySignalIds] = useState<string[]>([]);
  const [thoughtPatternIds, setThoughtPatternIds] = useState<string[]>([]);
  const [thoughtCustom, setThoughtCustom] = useState('');
  const [underneathIds, setUnderneathIds] = useState<string[]>([]);
  const [reflectionData, setReflectionData] = useState<DearManReflectionResult | null>(null);
  const [selectedCopeAheadId, setSelectedCopeAheadId] = useState<string | null>(null);
  const [reflectionLanded, setReflectionLanded] = useState<'yes' | 'sort_of' | 'not_really' | null>(null);
  const [debriefSaving, setDebriefSaving] = useState(false);
  const [debriefSaved, setDebriefSaved] = useState(false);
  const [stateResult, setStateResult] = useState<StateResultType | null>(null);

  // ── Safety gates (thresholds + copy from the graph; skipped silently when absent) ──
  const [showCarry, setShowCarry] = useState(true);
  const [checkStep, setCheckStep] = useState<'rate' | 'breathe' | 'rerate'>('rate');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [downshifted, setDownshifted] = useState(false);
  /** Heads-up on the Summary when it's still loud: offered, breathing, cooled, or waved off. Never a lock. */
  const [headsUp, setHeadsUp] = useState<'offer' | 'breathing' | 'cooled' | 'dismissed'>('offer');

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

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
        const gates = data.safetyGates?.gates;
        const canCheck = Boolean(gates && data.safetyCopy?.intensityQuestion && data.safetyCopy?.rerateQuestion);
        if (h) {
          const pre = handoffPrefill(h, data, data.safetyCopy?.handoffSituationId);
          if (pre.situationType) setSituationType(pre.situationType);
          if (pre.feelings.length) setFeelings(pre.feelings);
          if (pre.feelingCustom) { setFeelingCustom(pre.feelingCustom); setShowFeelingCustom(true); }
          initialHandoff.current = null;
          // The close rating can be higher than when "Ask them" unlocked: settle again first.
          if (canCheck && gates && h.intensity > gates.askMax) {
            setIntensity(h.intensity);
            setCheckStep(h.intensity >= gates.downshiftAt ? 'breathe' : 'rerate');
            setPhase('check');
          }
        } else if (cameFromCheckin.current && canCheck) {
          // Check-in is the most common way in: it gets the same intensity check as the entry button.
          setCheckStep('rate');
          setPhase('check');
        }
      })
      .catch(() => { setError("This tool couldn't load. Try again, or choose another tool."); })
      .finally(() => { loadInFlight.current = false; setLoading(false); });
  }, []);

  useEffect(() => { loadContent(); }, [loadContent]);

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

  // ── Resolve quadrant from debrief feelings and trigger analysis ──
  useEffect(() => {
    if (phase !== 'debrief-route' || stateResult || !debriefCurrentFeelings.length || !content) return;

    // Resolve majority quadrant from selected feelings
    const counts: Record<string, number> = {};
    for (const id of debriefCurrentFeelings) {
      const label = content.feelingChips.find((f: { id: string; label: string }) => f.id === id)?.label;
      if (label) {
        const emotion = getEmotionByName(label);
        if (emotion) counts[emotion.quadrant] = (counts[emotion.quadrant] || 0) + 1;
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const quadrant = sorted[0]?.[0] || 'high-unpleasant';

    const emotionIds = debriefCurrentFeelings
      .map(id => content.feelingChips.find((f: { id: string; label: string }) => f.id === id)?.label?.toLowerCase())
      .filter((l): l is string => Boolean(l));

    // Get recommendations
    getStateAndTools({ quadrant, emotions: emotionIds })
      .then(result => {
        setStateResult(result);
        // Save check-in with activation pattern
        saveCheckIn('', {
          emotion: emotionIds.join(', '),
          quadrant,
          intensity: { x: 0.5, y: 0.5 },
          bodySensations: [],
          note: 'From DEAR MAN debrief',
          timestamp: new Date(),
          activationPatternId: result.pattern?.id,
          confidence: result.pattern?.confidence,
        }).catch(() => {});
      })
      .catch(() => {});
  }, [phase]);

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
        if (checkStep === 'rate') setPhase('entry');
        else setCheckStep('rate');
        break;
      case 'scene':
        if (sceneStep > 0) setSceneStep(sceneStep - 1);
        else setPhase('entry');
        break;
      case 'describe': setSceneStep(3); setPhase('scene'); break;
      case 'express': setPhase('describe'); break;
      case 'assert': setPhase('express'); break;
      case 'reinforce': setPhase('assert'); break;
      case 'mindful': setPhase('reinforce'); break;
      case 'confident': setPhase('mindful'); break;
      case 'negotiate': setPhase('confident'); break;
      case 'summary': setPhase('negotiate'); break;
      case 'debrief-checkin': setPhase('entry'); break;
      case 'debrief-who': setPhase('debrief-checkin'); break;
      case 'debrief-overall': setPhase('debrief-who'); break;
      case 'debrief-moment': setPhase('debrief-overall'); break;
      case 'debrief-response': setPhase('debrief-moment'); break;
      case 'debrief-body': setPhase('debrief-response'); break;
      case 'debrief-thought': setPhase('debrief-body'); break;
      case 'debrief-underneath': setPhase('debrief-thought'); break;
      case 'debrief-reflection': setPhase('debrief-underneath'); break;
      case 'debrief-cope-select': setPhase('debrief-reflection'); break;
      case 'debrief-rehearsal': setPhase('debrief-cope-select'); break;
      case 'debrief-moment-plan': setPhase('debrief-rehearsal'); break;
      case 'debrief-route': setPhase('debrief-moment-plan'); break;
    }
  };

  // ── Safety gate helpers ──
  const sc = content.safetyCopy ?? {};
  const safetyGates = content.safetyGates ?? null;
  const gateThresholds = safetyGates?.gates ?? null;

  const startPrep = () => {
    if (safetyGates && sc.intensityQuestion && sc.rerateQuestion) {
      setCheckStep('rate');
      setPhase('check');
    } else {
      setPhase('scene');
    }
  };

  const rate = (n: number | null) => {
    if (n == null) return;
    setIntensity(n);
    if (nextAfterRating(n, gateThresholds, checkStep === 'rerate' || downshifted) === 'breathe') {
      setCheckStep('breathe');
    } else {
      setSceneStep(0);
      setPhase('scene');
    }
  };

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
    relationshipTypes.find(r => r.id === relationshipType)?.label?.toLowerCase() ?? 'them';

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
    const labels = feelings.map(id => resolveLabel(id, content.feelingChips)).filter(Boolean);
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
      await saveDearManSession({
        type: 'prep',
        relationshipType: relationshipType || '',
        situationType: situationType || '',
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
    setDebriefOverall(null);
    setDebriefCurrentFeelings([]); setDebriefRelationshipType(null);
    setTurningPointIds([]); setMomentResponseIds([]);
    setBodySignalIds([]); setThoughtPatternIds([]); setThoughtCustom('');
    setUnderneathIds([]); setReflectionData(null);
    setSelectedCopeAheadId(null); setReflectionLanded(null);
    setDebriefSaving(false); setDebriefSaved(false);
    setSaved(false); setSaveError(false);
    setHandoff(null); setShowCarry(true);
    setCheckStep('rate'); setIntensity(null); setDownshifted(false);
    setHeadsUp('offer');
  };

  // ─── ENTRY ───
  if (phase === 'entry') {
    return (
      <div className="space-y-4">
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
          onClick={() => {
            if (!debriefContent) {
              getDearManDebriefContent().then(setDebriefContent).catch(() => {});
            }
            setPhase('debrief-checkin');
          }}
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

  // ─── INTENSITY CHECK (own entry only; skipped when the graph has no gates) ───
  if (phase === 'check' && safetyGates) {
    const b = safetyGates.breatheCopy;
    const breathSeconds = Math.round(b.cycles * b.phases.reduce((t, p) => t + p.ms, 0) / 1000);
    return (
      <div className="space-y-6">
        <BackButton />
        {checkStep === 'breathe' ? (
          <div className="space-y-4">
            {sc.downshiftLead && <p className={secondaryText}>{sc.downshiftLead}</p>}
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{b.title}</h3>
            <p className={secondaryText}>{b.sub}</p>
            <LazyMotion features={domAnimation}>
              <BreathOrb phases={b.phases} cycles={b.cycles}
                startLabel={fill(b.start, { seconds: breathSeconds })}
                skipLabel={b.skip} doneLabel={b.done}
                onDone={() => { setDownshifted(true); setCheckStep('rerate'); }} />
            </LazyMotion>
          </div>
        ) : (
          <UrgeScale key={checkStep}
            label={(checkStep === 'rate' ? sc.intensityQuestion : sc.rerateQuestion) ?? ''}
            hint={checkStep === 'rate' ? sc.intensityHint : sc.rerateHint}
            value={null} onChange={rate}
            lowLabel={sc.intensityLow} highLabel={sc.intensityHigh} />
        )}
      </div>
    );
  }

  // ─── SCENE ───
  if (phase === 'scene') {
    return (
      <div className="space-y-6">
        {carryCard}
        {sceneStep > 0 && <BackButton />}
        <SceneDots />

        {/* Sub-step 0: Relationship type */}
        {sceneStep === 0 && (
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
                      ? 'bg-[var(--color-accent-fill)] text-white border-transparent'
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
            <div className="space-y-3">
              {content.situationTypes.map(st => (
                <button
                  key={st.id}
                  onClick={() => { setSituationType(st.id); setSceneStep(2); }}
                  className={`w-full text-left p-4 rounded-xl border cursor-pointer transition-colors ${
                    situationType === st.id
                      ? 'bg-[var(--color-accent-fill)] text-white border-transparent'
                      : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-accent)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl" role="img" aria-hidden="true">{st.emoji}</span>
                    <div>
                      <p className={`font-medium ${situationType === st.id ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>
                        {st.label}
                      </p>
                      <p className={`text-sm mt-0.5 ${situationType === st.id ? 'text-white/80' : 'text-[var(--color-text-secondary)]'}`}>
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
            <button onClick={() => setSceneStep(3)} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">Next</button>
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
                      selected ? 'bg-[var(--color-accent-fill)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}>
                    {b.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPhase('describe')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
              Let&apos;s build your script
            </button>
          </div>
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
                  ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary disabled:opacity-50">
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary disabled:opacity-50">
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
                      selected ? 'bg-[var(--color-accent-fill)] border-transparent text-white' : 'border-[var(--color-border)]'
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary disabled:opacity-50">
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
                  selected ? 'bg-[var(--color-accent-fill)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary disabled:opacity-50">
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
                    ? 'bg-[var(--color-accent-fill)] text-white border-transparent'
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
                                ? 'bg-[var(--color-accent-fill)] text-white border-transparent'
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
        <button onClick={() => setPhase('confident')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
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
        <button onClick={() => setPhase('negotiate')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
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
                    ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
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
                    ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
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

        <button onClick={enterSummary} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
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
    const hot = summaryHeadsUp({ latestIntensity: intensity, gates: gateThresholds }) && Boolean(sc.hotHeading);
    const b = safetyGates?.breatheCopy;

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
                        className="py-2.5 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
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
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">with your {getRelLabel()}</p>

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

          <div className="mb-6">
            <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">Body Reminder</p>
            <p className="text-[var(--color-text-secondary)] text-sm">Shoulders back, steady voice, feet on the ground.</p>
          </div>

          <hr className="border-[var(--color-border-subtle)] mb-6" />

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || saved}
              className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary disabled:opacity-50">
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

        <button onClick={() => {
            if (!debriefContent) {
              getDearManDebriefContent().then(setDebriefContent).catch(() => {});
            }
            setPhase('debrief-checkin');
          }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
          After the conversation &rarr; How did it go?
        </button>
      </div>
    );
  }

  // ─── Helper: resolve labels from debrief content ───
  const resolveBodySignalLabel = (id: string) =>
    debriefContent?.bodySignals.find(b => b.id === id)?.label ?? '';
  const resolveThoughtLabel = () => {
    const labels = thoughtPatternIds
      .filter(id => id !== 'thought_something_else')
      .map(id => debriefContent?.thoughtPatterns.find(t => t.id === id)?.label)
      .filter(Boolean);
    if (thoughtPatternIds.includes('thought_something_else') && thoughtCustom) {
      labels.push(thoughtCustom);
    }
    return labels.join(', ') || '';
  };
  const resolveCopeAheadLabel = () =>
    reflectionData?.copeAheadOptions.find(c => c.id === selectedCopeAheadId)?.label ?? '';

  const handleDebriefSave = async () => {
    setDebriefSaving(true);
    setSaveError(false);
    try {
      await saveDearManSession({
        type: 'debrief',
        relationshipType: debriefRelationshipType || '',
        situationType: '',
        priorities: [],
        barriers: [],
        describeId: null,
        describeCustom: '',
        feelings: [],
        assertId: null,
        assertCustom: '',
        reinforceIds: [],
        anchorPhrase: '',
        middleGroundId: null,
        middleGroundCustom: '',
        walkAwayId: null,
        walkAwayCustom: '',
        debriefOverall: debriefOverall || undefined,
        debriefCurrentFeelings: debriefCurrentFeelings,
        turningPointIds,
        momentResponseIds,
        bodySignalIds,
        thoughtPatternIds,
        underneathIds,
        copeAheadId: selectedCopeAheadId || undefined,
        reflectionLanded: reflectionLanded || undefined,
      });
      setDebriefSaved(true);
    } catch (err) {
      console.error('Failed to save DEAR MAN debrief:', err);
      setSaveError(true);
    } finally {
      setDebriefSaving(false);
    }
  };

  // TP → barrier mapping for "prepare to try again" carry-forward
  const tpToBarrierMap: Record<string, string> = {
    tp_defensive: 'barrier_angry',
    tp_crying_shutdown: 'barrier_emotional',
    tp_apologized: 'barrier_guilty',
    tp_no_words: 'barrier_dont_know',
  };

  // ─── DEBRIEF: CHECK-IN ───
  if (phase === 'debrief-checkin') {
    const highActivation = debriefCurrentFeelings.some(f => f === 'shaky' || f === 'wound_up');
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Before we look at the conversation &mdash; how are you feeling right now?</h3>
        <div className="flex flex-wrap gap-2">
          {content.feelingChips.map(f => {
            const selected = debriefCurrentFeelings.includes(f.id);
            return (
              <button key={f.id}
                onClick={() => toggleChip(f.id, debriefCurrentFeelings, setDebriefCurrentFeelings)}
                className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                  selected ? 'bg-[var(--color-accent-fill)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}>
                {f.label}
              </button>
            );
          })}
        </div>
        {highActivation && (
          <div className="p-4 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
            <p className="text-sm text-[var(--color-text-primary)]">
              It sounds like your body is still activated. Want to do a quick cool-down first?
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => navigate('/tool/tipp')}
                className="px-4 py-2 rounded-lg text-sm bg-[var(--color-warning-bg)] text-[var(--color-text-primary)] border border-[var(--color-warning-border)]">
                Cool down first
              </button>
              <button onClick={() => setPhase('debrief-who')}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)]">
                I&apos;m okay to continue
              </button>
            </div>
          </div>
        )}
        {!highActivation && debriefCurrentFeelings.length > 0 && (
          <button onClick={() => setPhase('debrief-who')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: WHO ───
  if (phase === 'debrief-who') {
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Who was this conversation with?</h3>
        <div className="flex flex-wrap gap-2">
          {relationshipTypes.map(r => (
            <button key={r.id}
              onClick={() => { setDebriefRelationshipType(r.id); setPhase('debrief-overall'); }}
              className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                debriefRelationshipType === r.id
                  ? 'bg-[var(--color-accent-fill)] text-white border-transparent'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── DEBRIEF: OVERALL ───
  if (phase === 'debrief-overall') {
    const overallMap: Record<string, string> = {
      better: debriefContent?.overallResponses.good ?? '',
      mixed: debriefContent?.overallResponses.mixed ?? '',
      not_well: debriefContent?.overallResponses.bad ?? '',
      didnt_have: debriefContent?.overallResponses.notYet ?? '',
    };
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">How did it go overall?</h3>
        <div className="space-y-3">
          {debriefOverallOptions.map(opt => (
            <button key={opt.id}
              onClick={() => setDebriefOverall(opt.id)}
              className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                debriefOverall === opt.id
                  ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {debriefOverall && overallMap[debriefOverall] && (
          <p className="text-sm text-[var(--color-text-secondary)] italic px-1">{overallMap[debriefOverall]}</p>
        )}
        {debriefOverall === 'didnt_have' && (
          <div className="flex gap-3">
            <button onClick={() => {
              if (debriefRelationshipType) setRelationshipType(debriefRelationshipType);
              setSceneStep(0); setPhase('scene');
            }}
              className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
              Prepare for it
            </button>
            <button onClick={() => setPhase('debrief-moment')}
              className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary">
              Walk through what worries me
            </button>
          </div>
        )}
        {debriefOverall && debriefOverall !== 'didnt_have' && (
          <button onClick={() => setPhase('debrief-moment')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: MOMENT (turning point) ───
  if (phase === 'debrief-moment') {
    if (!debriefContent) {
      return (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      );
    }
    const lastSelectedTp = turningPointIds.length > 0
      ? debriefContent.turningPoints.find(t => t.id === turningPointIds[turningPointIds.length - 1])
      : null;
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Was there a moment where things shifted?</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Select all that apply.</p>
        <div className="space-y-3">
          {debriefContent.turningPoints.map(tp => {
            const selected = turningPointIds.includes(tp.id);
            return (
              <button key={tp.id}
                onClick={() => {
                  // "went okay" is exclusive — deselect others
                  if (tp.id === 'tp_went_okay') {
                    setTurningPointIds(selected ? [] : ['tp_went_okay']);
                  } else {
                    const without = turningPointIds.filter(id => id !== 'tp_went_okay');
                    setTurningPointIds(
                      selected ? without.filter(id => id !== tp.id) : [...without, tp.id]
                    );
                  }
                  setReflectionData(null);
                }}
                className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                  selected
                    ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                }`}>
                {tp.label}
              </button>
            );
          })}
        </div>
        {lastSelectedTp && (
          <p className="text-sm text-[var(--color-text-secondary)] italic px-1">{lastSelectedTp.validationText}</p>
        )}
        {turningPointIds.length > 0 && (
          <button onClick={() => {
            if (turningPointIds.length === 1 && turningPointIds[0] === 'tp_went_okay') {
              // Skip response selection — go straight to body
              setMomentResponseIds(['mr_stayed_course']);
              getDearManReflection(['tp_went_okay'], ['mr_stayed_course'])
                .then(setReflectionData).catch(() => {});
              setPhase('debrief-body');
            } else {
              setPhase('debrief-response');
            }
          }}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: RESPONSE (what did you do in that moment) ───
  if (phase === 'debrief-response') {
    if (!debriefContent) return null;
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What did you do in that moment?</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Select all that apply.</p>
        <div className="space-y-3">
          {debriefContent.momentResponses.map(mr => {
            const selected = momentResponseIds.includes(mr.id);
            return (
              <button key={mr.id}
                onClick={() => {
                  setMomentResponseIds(
                    selected ? momentResponseIds.filter(id => id !== mr.id) : [...momentResponseIds, mr.id]
                  );
                  setReflectionData(null);
                }}
                className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                  selected
                    ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                }`}>
                {mr.label}
              </button>
            );
          })}
        </div>
        {momentResponseIds.length > 0 && (
          <button onClick={() => {
            if (turningPointIds.length && momentResponseIds.length) {
              getDearManReflection(turningPointIds, momentResponseIds)
                .then(setReflectionData).catch(() => {});
            }
            setPhase('debrief-body');
          }}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: BODY ───
  if (phase === 'debrief-body') {
    if (!debriefContent) return null;
    const selectedNone = bodySignalIds.includes('bs_none');
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What was happening in your body?</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Right before or during that moment.</p>
        <div className="flex flex-wrap gap-2">
          {debriefContent.bodySignals.map(bs => {
            const selected = bodySignalIds.includes(bs.id);
            return (
              <button key={bs.id}
                onClick={() => {
                  if (bs.id === 'bs_none') {
                    setBodySignalIds(['bs_none']);
                  } else {
                    const filtered = bodySignalIds.filter(id => id !== 'bs_none');
                    setBodySignalIds(
                      filtered.includes(bs.id)
                        ? filtered.filter(id => id !== bs.id)
                        : [...filtered, bs.id]
                    );
                  }
                }}
                className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                  selected ? 'bg-[var(--color-accent-fill)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}>
                {bs.label}
              </button>
            );
          })}
        </div>
        {selectedNone && (
          <p className="text-sm text-[var(--color-text-secondary)] italic px-1">
            That&apos;s okay. Noticing &ldquo;nothing&rdquo; is still noticing. Over time, you might start catching subtler signals.
          </p>
        )}
        {bodySignalIds.length > 0 && (
          <button onClick={() => setPhase('debrief-thought')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: THOUGHT ───
  if (phase === 'debrief-thought') {
    if (!debriefContent) return null;
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What thoughts showed up?</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Select all that apply.</p>
        <div className="space-y-3">
          {debriefContent.thoughtPatterns.map(tp => {
            const selected = thoughtPatternIds.includes(tp.id);
            return (
              <div key={tp.id}>
                <button
                  onClick={() => setThoughtPatternIds(
                    selected ? thoughtPatternIds.filter(id => id !== tp.id) : [...thoughtPatternIds, tp.id]
                  )}
                  className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                  }`}>
                  {tp.label}
                </button>
                {tp.id === 'thought_something_else' && selected && (
                  <input
                    type="text"
                    value={thoughtCustom}
                    onChange={e => setThoughtCustom(e.target.value)}
                    placeholder="What was the thought?"
                    className="w-full mt-2 px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                )}
              </div>
            );
          })}
        </div>
        {thoughtPatternIds.length > 0 && (!thoughtPatternIds.includes('thought_something_else') || thoughtCustom.trim()) && (
          <button onClick={() => setPhase('debrief-underneath')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: UNDERNEATH ───
  if (phase === 'debrief-underneath') {
    if (!debriefContent) return null;
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Underneath that &mdash; what was the deeper feeling?</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">Select all that apply.</p>
        <div className="space-y-3">
          {debriefContent.underneathEmotions.map(u => {
            const selected = underneathIds.includes(u.id);
            return (
              <button key={u.id}
                onClick={() => {
                  // "not sure" is exclusive
                  if (u.id === 'under_not_sure') {
                    setUnderneathIds(selected ? [] : ['under_not_sure']);
                  } else {
                    const without = underneathIds.filter(id => id !== 'under_not_sure');
                    setUnderneathIds(
                      selected ? without.filter(id => id !== u.id) : [...without, u.id]
                    );
                  }
                }}
                className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                  selected
                    ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                }`}>
                {u.label}
              </button>
            );
          })}
        </div>
        {underneathIds.length > 0 && (
          <button onClick={() => setPhase('debrief-reflection')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: REFLECTION ───
  if (phase === 'debrief-reflection') {
    if (!reflectionData) {
      return (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
          <p className="text-[var(--color-text-secondary)]">Putting something together for you...</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <BackButton />
        <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] space-y-3">
          {reflectionData.reflection.split('\n\n').map((para, i) => (
            <p key={i} className="text-[var(--color-text-primary)] leading-relaxed">{para}</p>
          ))}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">Does that land?</p>
        <div className="flex gap-3">
          {([
            { id: 'yes' as const, label: "Yeah, that's it" },
            { id: 'sort_of' as const, label: 'Sort of' },
            { id: 'not_really' as const, label: 'Not really' },
          ]).map(opt => (
            <button key={opt.id}
              onClick={() => { setReflectionLanded(opt.id); setPhase('debrief-cope-select'); }}
              className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary hover:border-[var(--color-border-accent)] transition-colors">
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── DEBRIEF: COPE-AHEAD SELECT ───
  if (phase === 'debrief-cope-select') {
    if (!reflectionData) return null;
    const bodyLabel = bodySignalIds.filter(id => id !== 'bs_none').map(resolveBodySignalLabel).filter(Boolean).join(', ');
    const thoughtLabel = resolveThoughtLabel();
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Let&apos;s build a plan for next time.</h3>
        {(bodyLabel || thoughtLabel) && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            When you notice{bodyLabel ? ` "${bodyLabel.toLowerCase()}"` : ''}{bodyLabel && thoughtLabel ? ' and' : ''}{thoughtLabel ? ` the thought "${thoughtLabel}"` : ''} &mdash; what could you try?
          </p>
        )}
        <div className="space-y-3">
          {reflectionData.copeAheadOptions.map(ca => (
            <button key={ca.id}
              onClick={() => { setSelectedCopeAheadId(ca.id); setPhase('debrief-rehearsal'); }}
              className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                selectedCopeAheadId === ca.id
                  ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
              }`}>
              {ca.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── DEBRIEF: REHEARSAL ───
  if (phase === 'debrief-rehearsal') {
    const selectedCa = reflectionData?.copeAheadOptions.find(c => c.id === selectedCopeAheadId);
    if (!selectedCa) return null;
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedCa.label}</h3>
        <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-primary)] leading-relaxed">{selectedCa.rehearsal}</p>
        </div>
        <button onClick={() => setPhase('debrief-moment-plan')}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
          I tried it
        </button>
      </div>
    );
  }

  // ─── DEBRIEF: MOMENT PLAN ───
  if (phase === 'debrief-moment-plan') {
    const bodyLabel = bodySignalIds.filter(id => id !== 'bs_none').map(resolveBodySignalLabel).filter(Boolean).join(' or ');
    const thoughtLabel = resolveThoughtLabel();
    const copeLabel = resolveCopeAheadLabel();
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Your moment plan</h3>
        <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-primary)] leading-relaxed">
            When I feel{bodyLabel ? ` ${bodyLabel.toLowerCase()}` : ' the signal'} and the thought &ldquo;{thoughtLabel || '...'}&rdquo; shows up, I&apos;m going to: &ldquo;{copeLabel || '...'}&rdquo;
          </p>
        </div>
        <button
          onClick={handleDebriefSave}
          disabled={debriefSaving || debriefSaved}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary disabled:opacity-50">
          {debriefSaved ? 'Saved' : debriefSaving ? 'Saving...' : 'Save my moment plan'}
        </button>
        {debriefSaved && (
          <button onClick={() => setPhase('debrief-route')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Continue
          </button>
        )}
      </div>
    );
  }

  // ─── DEBRIEF: ROUTE ───
  if (phase === 'debrief-route') {
    const topTools = stateResult?.tools?.slice(0, 2) || [];
    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)] space-y-4">
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">That took courage.</h3>
        <p className="text-[var(--color-text-secondary)]">Whether it went well or not, you showed up.</p>

        {topTools.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-sm text-[var(--color-text-secondary)]">Based on how you're feeling, this might help:</p>
            {topTools.map(tool => {
              const meta = getToolById(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => navigate(`/tool/${tool.id}`)}
                  className="w-full text-left p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:border-[var(--color-accent)] transition-colors"
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {meta?.emoji ? `${meta.emoji} ` : ''}{meta?.name || tool.name}
                  </span>
                  <span className="block text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {meta?.tagline || tool.description}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => {
              // Carry context into prep flow
              if (debriefRelationshipType) setRelationshipType(debriefRelationshipType);
              // Map TP to barriers
              const mappedBarriers = turningPointIds
                .map(id => tpToBarrierMap[id])
                .filter(Boolean);
              // Reset prep-specific fields
              setSceneStep(0);
              setSituationType(null);
              setBarriers(mappedBarriers);
              setBarriersCustom(mappedBarriers.map(barrierLabel).filter(Boolean).join('\n'));
              setDescribeId(null); setDescribeCustom('');
              setFeelings([]); setFeelingCustom(''); setShowFeelingCustom(false); setShowMirror(false);
              setAssertIds([]); setAssertDetails({}); setAssertCustom(''); setShowAssertCustom(false);
              setReinforceIds([]); setReinforceCustom(''); setShowReinforceCustom(false);
              setAnchorPhrase(''); setShowAnchorGen(false); setAnchorNeedId(null); setAnchorShowAll(false);
              setMiddleGroundId(null); setMiddleGroundCustom(''); setShowMiddleGroundCustom(false);
              setWalkAwayId(null); setWalkAwayCustom(''); setShowWalkAwayCustom(false);
              setSaved(false);
              setPhase('scene');
            }}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary">
            Prepare to try again
          </button>
          <button onClick={() => navigate('/category/better-relationships')}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary">
            Done for now
          </button>
        </div>
      </div>
    );
  }

  return null;
}
