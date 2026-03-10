import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDearManContent, saveDearManSession, getDearManDebriefContent, getDearManReflection, saveCheckIn, getStateAndTools } from '../../services/neo4j';
import type { DearManContentResult, DearManDebriefContentResult, DearManReflectionResult } from '../../data/dearManTypes';
import type { StateResult as StateResultType } from '../../services/neo4j';
import { getEmotionByName } from '../../data/emotions';
import { getToolById } from '../../data/tools';

type Phase =
  | 'entry'
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

const debriefOverallOptions = [
  { id: 'better', label: 'Better than I expected' },
  { id: 'mixed', label: 'Mixed' },
  { id: 'not_well', label: "It didn't go well" },
  { id: 'didnt_have', label: "Didn't have it yet" },
];

export function DearMan() {
  const location = useLocation();
  const navigate = useNavigate();
  const checkinEmotions = (location.state as { checkinEmotions?: string[] } | null)?.checkinEmotions;

  // ── Graph content (loaded once) ──
  const [content, setContent] = useState<DearManContentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Phase state ──
  const [phase, setPhase] = useState<Phase>(checkinEmotions?.length ? 'scene' : 'entry');
  const [sceneStep, setSceneStep] = useState(0);

  // ── Scene data ──
  const [relationshipType, setRelationshipType] = useState<string | null>(null);
  const [situationType, setSituationType] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<string[]>(priorityOptions.map(p => p.id));
  const [removedPriorities, setRemovedPriorities] = useState<string[]>([]);
  const [barriers, setBarriers] = useState<string[]>([]);

  // ── Script data (ID-based + custom escape hatches) ──
  const [describeId, setDescribeId] = useState<string | null>(null);
  const [describeCustom, setDescribeCustom] = useState('');
  const [showDescribeCustom, setShowDescribeCustom] = useState(false);

  const [feelings, setFeelings] = useState<string[]>([]);
  const [feelingCustom, setFeelingCustom] = useState('');
  const [showFeelingCustom, setShowFeelingCustom] = useState(false);

  const [assertId, setAssertId] = useState<string | null>(null);
  const [assertCustom, setAssertCustom] = useState('');
  const [showAssertCustom, setShowAssertCustom] = useState(false);

  const [reinforceIds, setReinforceIds] = useState<string[]>([]);
  const [reinforceCustom, setReinforceCustom] = useState('');
  const [showReinforceCustom, setShowReinforceCustom] = useState(false);

  // ── Prep data ──
  const [anchorPhrase, setAnchorPhrase] = useState('');

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

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // ── Load content from graph on mount ──
  useEffect(() => {
    getDearManContent()
      .then(data => { setContent(data); setLoading(false); })
      .catch(() => { setError('Could not load. Please try again.'); setLoading(false); });
  }, []);

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
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4" />
        <p className="text-[var(--color-text-secondary)]">Loading...</p>
      </div>
    );
  }
  if (error || !content) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--color-text-secondary)]">{error || 'Something went wrong.'}</p>
      </div>
    );
  }

  // ── Helpers ──

  const goBack = () => {
    switch (phase) {
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
              ? 'bg-[var(--color-accent)]'
              : i < sceneStep
                ? 'bg-[var(--color-accent)] opacity-40'
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

  const getRelLabel = () =>
    relationshipTypes.find(r => r.id === relationshipType)?.label?.toLowerCase() ?? 'them';

  const getPriorityLabel = (id: string) =>
    priorityOptions.find(p => p.id === id)?.label ?? id;

  // Resolve an option ID to its label from a list
  const resolveLabel = (id: string | null, options: Array<{ id: string; label: string }>) =>
    options.find(o => o.id === id)?.label ?? '';

  // Resolve selected describe text for summary
  const resolveDescribe = () => {
    if (describeId && situationType) {
      return resolveLabel(describeId, content.describeOptions[situationType] ?? []);
    }
    return describeCustom;
  };

  // Resolve selected feelings for summary
  const resolveFeelings = () => {
    const labels = feelings.map(id => resolveLabel(id, content.feelingChips)).filter(Boolean);
    if (feelingCustom.trim()) labels.push(feelingCustom.trim());
    return labels;
  };

  // Resolve selected assert text for summary
  const resolveAssert = () => {
    if (assertId && situationType) {
      const opt = (content.assertOptions[situationType] ?? []).find(o => o.id === assertId);
      if (opt) {
        if (opt.hasPlaceholder && assertCustom.trim()) {
          return opt.label.replace(/\[.*?\]/g, assertCustom.trim());
        }
        return opt.label;
      }
    }
    return assertCustom;
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
  // Can continue from assert?
  const hasAssert = (() => {
    if (assertId) {
      const opt = situationType ? (content.assertOptions[situationType] ?? []).find(o => o.id === assertId) : null;
      if (opt?.hasPlaceholder) return assertCustom.trim().length > 0;
      return true;
    }
    return assertCustom.trim().length > 0;
  })();
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
        describeId,
        describeCustom,
        feelings,
        assertId,
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
    setBarriers([]);
    setDescribeId(null); setDescribeCustom(''); setShowDescribeCustom(false);
    setFeelings([]); setFeelingCustom(''); setShowFeelingCustom(false);
    setAssertId(null); setAssertCustom(''); setShowAssertCustom(false);
    setReinforceIds([]); setReinforceCustom(''); setShowReinforceCustom(false);
    setAnchorPhrase('');
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
  };

  // ─── ENTRY ───
  if (phase === 'entry') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          What brings you here?
        </h3>
        <button
          onClick={() => setPhase('scene')}
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

  // ─── SCENE ───
  if (phase === 'scene') {
    return (
      <div className="space-y-6">
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
                      ? 'bg-[var(--color-accent)] text-white border-transparent'
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
                      ? 'bg-[var(--color-accent)] text-white border-transparent'
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
            <button onClick={() => setSceneStep(3)} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">Next</button>
          </div>
        )}

        {/* Sub-step 3: Barriers (from graph) */}
        {sceneStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">What makes this hard?</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">Pick everything that applies.</p>
            <div className="flex flex-wrap gap-2">
              {content.barriers.map(b => {
                const selected = barriers.includes(b.id);
                return (
                  <button key={b.id}
                    onClick={() => toggleChip(b.id, barriers, setBarriers)}
                    className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                      selected ? 'bg-[var(--color-accent)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}>
                    {b.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPhase('describe')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
        <p className="text-[var(--color-text-secondary)]">Pick the one that fits best.</p>
        <div className="space-y-2">
          {options.map(opt => (
            <button key={opt.id}
              onClick={() => { setDescribeId(opt.id); setShowDescribeCustom(false); setDescribeCustom(''); }}
              className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                describeId === opt.id
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {!showDescribeCustom ? (
          <button onClick={() => { setShowDescribeCustom(true); setDescribeId(null); }}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
            + None of these &mdash; I&apos;ll describe it myself
          </button>
        ) : (
          <textarea rows={3} value={describeCustom}
            onChange={e => setDescribeCustom(e.target.value)}
            placeholder="Describe what happened..."
            autoFocus
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none" />
        )}
        <button onClick={() => setPhase('express')} disabled={!hasDescribe}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50">
          Next: How you feel
        </button>
        {content.stepInsights.describe && (
          <p className="text-sm text-[var(--color-text-tertiary)] italic">{content.stepInsights.describe}</p>
        )}
      </div>
    );
  }

  // ─── EXPRESS ───
  if (phase === 'express') {
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">How does this make you feel?</h3>
        <p className="text-[var(--color-text-secondary)]">Tap all that apply.</p>
        <div className="flex flex-wrap gap-2">
          {content.feelingChips.map(f => {
            const selected = feelings.includes(f.id);
            return (
              <button key={f.id}
                onClick={() => toggleChip(f.id, feelings, setFeelings)}
                className={`px-4 py-2 rounded-full border cursor-pointer transition-all ${
                  selected ? 'bg-[var(--color-accent)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}>
                {f.label}
              </button>
            );
          })}
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
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
        )}
        <button onClick={() => setPhase('assert')} disabled={!hasExpress}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50">
          Next: What you need
        </button>
        {content.stepInsights.express && (
          <p className="text-sm text-[var(--color-text-tertiary)] italic">{content.stepInsights.express}</p>
        )}
      </div>
    );
  }

  // ─── ASSERT ───
  if (phase === 'assert') {
    const options = situationType ? (content.assertOptions[situationType] ?? []) : [];
    const selectedOpt = options.find(o => o.id === assertId);
    return (
      <div className="space-y-6">
        <BackButton />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
          What specifically are you asking for &mdash; or saying no to?
        </h3>

        {/* Barrier-specific coaching for guilty */}
        {barriers.includes('barrier_guilty') && content.assertBarrierGuilty && (
          <div className="bg-[var(--color-accent-muted)] rounded-lg p-3 text-sm text-[var(--color-text-secondary)]">
            {content.assertBarrierGuilty}
          </div>
        )}

        <div className="space-y-2">
          {options.map(opt => (
            <button key={opt.id}
              onClick={() => { setAssertId(opt.id); setShowAssertCustom(false); if (!opt.hasPlaceholder) setAssertCustom(''); }}
              className={`w-full text-left py-3 px-4 rounded-lg border transition-colors ${
                assertId === opt.id
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Placeholder fill-in for selected option */}
        {selectedOpt?.hasPlaceholder && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-secondary)]">Fill in the specifics:</p>
            <input type="text" value={assertCustom}
              onChange={e => setAssertCustom(e.target.value)}
              placeholder="Be specific..."
              autoFocus
              className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
          </div>
        )}

        {!showAssertCustom ? (
          <button onClick={() => { setShowAssertCustom(true); setAssertId(null); setAssertCustom(''); }}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors">
            + None of these &mdash; I&apos;ll say it myself
          </button>
        ) : (
          <textarea rows={3} value={assertCustom}
            onChange={e => setAssertCustom(e.target.value)}
            placeholder="What are you asking for?"
            autoFocus
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none" />
        )}

        <button onClick={() => setPhase('reinforce')} disabled={!hasAssert}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50">
          Next: Why it matters
        </button>
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
                  selected ? 'bg-[var(--color-accent)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50">
          Next: Getting ready
        </button>
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
            className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Or pick one:</p>
          <div className="flex flex-wrap gap-2">
            {content.anchorPhrases.map(a => (
              <button key={a.id} onClick={() => setAnchorPhrase(a.label)}
                className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-accent)] transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setPhase('confident')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
        <button onClick={() => setPhase('negotiate')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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

        <button onClick={() => setPhase('summary')} className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
          See your plan
        </button>
      </div>
    );
  }

  // ─── SUMMARY ───
  if (phase === 'summary') {
    const describeText = resolveDescribe();
    const feelingsText = resolveFeelings();
    const assertText = resolveAssert();
    const reinforceTexts = resolveReinforce();
    const mgText = resolveMiddleGround();
    const waText = resolveWalkAway();

    return (
      <div className="space-y-6">
        <BackButton />
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
            <p className="text-[var(--color-text-primary)]">{assertText}</p>
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
              className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50">
              {saved ? 'Saved' : saving ? 'Saving...' : saveError ? 'Try again' : 'Save this plan'}
            </button>
            <button onClick={reset}
              className="flex-1 py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary">
              Start over
            </button>
          </div>
          {saveError && (
            <p className="text-red-500 text-sm mt-2 text-center">Something went wrong saving your plan. Please try again.</p>
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
                  selected ? 'bg-[var(--color-accent)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}>
                {f.label}
              </button>
            );
          })}
        </div>
        {highActivation && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              It sounds like your body is still activated. Want to do a quick cool-down first?
            </p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => navigate('/tool/tipp')}
                className="px-4 py-2 rounded-lg text-sm bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                  ? 'bg-[var(--color-accent)] text-white border-transparent'
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
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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
              className="flex-1 py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                  selected ? 'bg-[var(--color-accent)] text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                      ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                }`}>
                {u.label}
              </button>
            );
          })}
        </div>
        {underneathIds.length > 0 && (
          <button onClick={() => setPhase('debrief-reflection')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
                  ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50">
          {debriefSaved ? 'Saved' : debriefSaving ? 'Saving...' : 'Save my moment plan'}
        </button>
        {debriefSaved && (
          <button onClick={() => setPhase('debrief-route')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
              if (mappedBarriers.length) setBarriers(mappedBarriers);
              // Reset prep-specific fields
              setSceneStep(0);
              setSituationType(null);
              setDescribeId(null); setDescribeCustom(''); setShowDescribeCustom(false);
              setFeelings([]); setFeelingCustom(''); setShowFeelingCustom(false);
              setAssertId(null); setAssertCustom(''); setShowAssertCustom(false);
              setReinforceIds([]); setReinforceCustom(''); setShowReinforceCustom(false);
              setAnchorPhrase('');
              setMiddleGroundId(null); setMiddleGroundCustom(''); setShowMiddleGroundCustom(false);
              setWalkAwayId(null); setWalkAwayCustom(''); setShowWalkAwayCustom(false);
              setSaved(false);
              setPhase('scene');
            }}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary">
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
