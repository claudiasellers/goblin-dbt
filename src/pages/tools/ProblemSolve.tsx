import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getEmotionById, getEmotionByName } from '../../data/emotions';
import { EmotionPicker } from '../../components/tools/EmotionPicker';
import { getToolById } from '../../data/tools';
import {
  getProblemSolveContent,
  type ProblemSolveContent,
  type ProblemTypeData,
  type SolutionDirectionData,
  type BarrierTypeData,
  type BarrierSubResponseData,
  type AmbivalenceOptionData,
  type DecompositionAspectData,
} from '../../services/neo4j';

type Phase =
  | 'intro'
  | 'identify'
  | 'loading'
  | 'readiness-check'
  | 'redirect'
  | 'define-problem'
  | 'triage'
  | 'barrier-assessment'
  | 'barrier-sub'
  | 'ambivalence'
  | 'confidence-ruler'
  | 'decompose'
  | 'solutions'
  | 'commit'
  | 'complete';

export function ProblemSolve() {
  const location = useLocation();
  const navigate = useNavigate();
  const rawCheckinEmotions = (location.state as { checkinEmotions?: string[] } | null)?.checkinEmotions;
  const checkinEmotionIds = useMemo(() => {
    if (!rawCheckinEmotions?.length) return undefined;
    return rawCheckinEmotions
      .map(name => getEmotionByName(name)?.id ?? getEmotionById(name)?.id)
      .filter((id): id is string => id != null);
  }, [rawCheckinEmotions]);
  const didAutoLoad = useRef(false);

  // Phase state
  const [phase, setPhase] = useState<Phase>('intro');
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>(checkinEmotionIds ?? []);

  // Graph data
  const [psData, setPsData] = useState<ProblemSolveContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Problem definition
  const [problemDescription, setProblemDescription] = useState('');
  const [selectedProblemTypes, setSelectedProblemTypes] = useState<ProblemTypeData[]>([]);

  // Barrier assessment (MI)
  const [selectedBarrier, setSelectedBarrier] = useState<BarrierTypeData | null>(null);
  const [selectedSubResponse, setSelectedSubResponse] = useState<BarrierSubResponseData | null>(null);
  const [showTherapeuticResponse, setShowTherapeuticResponse] = useState(false);
  const [selectedAmbivalence, setSelectedAmbivalence] = useState<AmbivalenceOptionData | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low' | 'none' | null>(null);

  // Decomposition (outside-control path)
  const [aspectBuckets, setAspectBuckets] = useState<Record<string, 'fact' | 'others' | 'yours'>>({});
  const [decompositionDone, setDecompositionDone] = useState(false);

  // Solutions + commit
  const [selectedDirection, setSelectedDirection] = useState<SolutionDirectionData | null>(null);
  const [chosenSize, setChosenSize] = useState<'small' | 'medium' | 'bigger' | null>(null);
  const [solutionSizeHint, setSolutionSizeHint] = useState<string | null>(null);

  // Rumination guard
  const [defineEntryCount, setDefineEntryCount] = useState(0);
  const [showRuminationGuard, setShowRuminationGuard] = useState(false);
  const [ruminationDismissed, setRuminationDismissed] = useState(false);

  // Readiness redirect
  const [showReadinessRedirect, setShowReadinessRedirect] = useState(false);

  // Know-but-cant commit (user supplies their own step)
  const [customStepText, setCustomStepText] = useState('');

  // ── Load content ──

  const loadContent = useCallback(async (emotionIds: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProblemSolveContent(emotionIds);
      setPsData(data);
      const hasApplicable = data.emotions.some(e => e.applicable);
      setPhase(hasApplicable ? 'readiness-check' : 'redirect');
    } catch {
      setError("This tool couldn't load. Try again, or choose another tool.");
      setPhase('identify');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load when arriving from OA/check-in with pre-selected emotions
  useEffect(() => {
    if (!checkinEmotionIds?.length || didAutoLoad.current) return;
    didAutoLoad.current = true;
    loadContent(checkinEmotionIds);
  }, [checkinEmotionIds, loadContent]);

  // ── Derived data ──

  const applicableEmotions = useMemo(
    () => psData?.emotions.filter(e => e.applicable) ?? [],
    [psData]
  );

  const nonApplicable = useMemo(
    () => psData?.emotions.filter(e => !e.applicable) ?? [],
    [psData]
  );

  const applicableParents = useMemo(() => {
    const parentKeys = [...new Set(
      applicableEmotions
        .map(e => e.dbtParent)
        .filter((p): p is string => p != null)
    )];
    return parentKeys
      .filter(p => psData?.parents[p])
      .map(p => ({ key: p, ...psData!.parents[p] }));
  }, [applicableEmotions, psData]);

  const allProblemTypes = useMemo(
    () => applicableParents.flatMap(p => p.problemTypes),
    [applicableParents]
  );

  // Decomposition aspects for selected problem type
  const decompositionAspects = useMemo((): DecompositionAspectData[] => {
    if (selectedProblemTypes.length > 0) {
      const aspects = selectedProblemTypes.flatMap(pt => pt.decompositionAspects ?? []);
      if (aspects.length > 0) return aspects;
    }
    // Fall back to first problem type if user typed own description
    const firstPt = applicableParents[0]?.problemTypes[0];
    return firstPt?.decompositionAspects ?? [];
  }, [selectedProblemTypes, applicableParents]);

  // ── Actions ──

  const continueFromIdentify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProblemSolveContent(selectedEmotionIds);
      setPsData(data);
      const hasApplicable = data.emotions.some(e => e.applicable);
      setPhase(hasApplicable ? 'readiness-check' : 'redirect');
    } catch {
      setError("This tool couldn't load. Try again, or choose another tool.");
    } finally {
      setLoading(false);
    }
  }, [selectedEmotionIds]);

  const goToDefine = () => {
    const newCount = defineEntryCount + 1;
    setDefineEntryCount(newCount);
    if (newCount > 1 && applicableParents.some(p => p.ruminationRiskLevel === 'high') && !ruminationDismissed) {
      setShowRuminationGuard(true);
    } else {
      setShowRuminationGuard(false);
    }
    setPhase('define-problem');
  };

  const reset = () => {
    setPhase('intro');
    setSelectedEmotionIds([]);
    setPsData(null);
    setError(null);
    setProblemDescription('');
    setSelectedProblemTypes([]);
    setSelectedBarrier(null);
    setSelectedSubResponse(null);
    setShowTherapeuticResponse(false);
    setSelectedAmbivalence(null);
    setConfidenceLevel(null);
    setAspectBuckets({});
    setDecompositionDone(false);
    setSelectedDirection(null);
    setChosenSize(null);
    setSolutionSizeHint(null);
    setDefineEntryCount(0);
    setShowRuminationGuard(false);
    setRuminationDismissed(false);
    setShowReadinessRedirect(false);
    setCustomStepText('');
  };

  // ── Helpers ──

  const toolName = (id: string) => {
    const t = getToolById(id);
    return t ? `${t.emoji} ${t.name}` : id;
  };

  const handleBarrierSelect = (barrier: BarrierTypeData) => {
    setSelectedBarrier(barrier);
    setSelectedSubResponse(null);
    setShowTherapeuticResponse(false);

    switch (barrier.id) {
      case 'know-but-cant':
      case 'involves-person':
      case 'tried-nothing-works':
        setPhase('barrier-sub');
        break;
      case 'not-sure-what':
        setPhase('solutions');
        break;
      case 'outside-control':
        // Initialize aspect buckets with defaults
        const buckets: Record<string, 'fact' | 'others' | 'yours'> = {};
        for (const a of decompositionAspects) {
          buckets[a.id] = a.defaultBucket as 'fact' | 'others' | 'yours';
        }
        setAspectBuckets(buckets);
        setDecompositionDone(false);
        setPhase('decompose');
        break;
    }
  };

  // ─── LOADING FROM CHECK-IN ───
  if (loading && phase === 'intro') {
    const names = selectedEmotionIds.map(id => getEmotionById(id)?.name?.toLowerCase()).filter(Boolean);
    const label = names.length <= 2 ? names.join(' and ') : names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4"></div>
        <p className="text-[var(--color-text-secondary)]">
          Loading for {label}...
        </p>
      </div>
    );
  }

  // ─── INTRO ───
  if (phase === 'intro') {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            How this works
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            This tool helps when your emotion is telling you something real — there's an actual problem to address. We'll figure out what the problem is, what's blocking you, and pick one concrete next step.
          </p>
        </div>
        <button
          onClick={() => setPhase('identify')}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
        >
          Let's start
        </button>
      </div>
    );
  }

  // ─── IDENTIFY ───
  if (phase === 'identify') {
    return (
      <EmotionPicker
        selectedIds={selectedEmotionIds}
        onChange={setSelectedEmotionIds}
        onContinue={continueFromIdentify}
        loading={loading}
        error={error}
      />
    );
  }

  // ─── READINESS CHECK ───
  if (phase === 'readiness-check' && psData) {
    if (showReadinessRedirect) {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-secondary)]">
              {psData.protocol.readinessRedirectMessage}
            </p>
          </div>
          {psData.protocol.readinessRedirectTools.map(toolId => (
            <Link
              key={toolId}
              to={`/tool/${toolId}`}
              className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary text-center"
            >
              {toolName(toolId)}
            </Link>
          ))}
          <button
            onClick={() => setShowReadinessRedirect(false)}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Actually, I can think about this
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-primary)]">
            {psData.protocol.readinessCheck}
          </p>
        </div>
        <button
          onClick={goToDefine}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
        >
          I can think about this
        </button>
        <button
          onClick={() => setShowReadinessRedirect(true)}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          It's too intense right now
        </button>
      </div>
    );
  }

  // ─── REDIRECT (not PS applicable) ───
  if (phase === 'redirect' && psData) {
    const altNames: Record<string, string> = {
      'opposite-action': 'Do the Opposite',
      'mindfulness-emotions': 'Sit With It (Mindfulness)',
      'body-scan': 'Body Scan',
      'check-the-facts': 'Check the Facts',
      'self-validate': 'Self-Validation',
    };
    const notApplicableNames = nonApplicable.map(m => getEmotionById(m.emotionId)?.name).filter(Boolean);
    const uniqueAlts = [...new Set(nonApplicable.map(m => m.alternativeSkill).filter(Boolean))] as string[];

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            Problem Solve isn't the best fit for {notApplicableNames.length === 1
              ? `"${notApplicableNames[0]}"`
              : 'these emotions'}
          </h3>
          {nonApplicable.map(m => (
            <p key={m.emotionId} className="text-[var(--color-text-secondary)] mb-2">
              {m.clinicalNote}
            </p>
          ))}
        </div>

        {uniqueAlts.map(alt => (
          <Link
            key={alt}
            to={`/tool/${alt}`}
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary text-center"
          >
            Try {altNames[alt] ?? alt}
          </Link>
        ))}

        <button
          onClick={() => { setPhase('identify'); setSelectedEmotionIds([]); setPsData(null); }}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          Pick different emotions
        </button>
      </div>
    );
  }

  // ─── DEFINE PROBLEM ───
  if (phase === 'define-problem' && psData) {
    const firstParent = applicableParents[0];
    if (!firstParent) {
      setPhase('redirect');
      return null;
    }

    const ruminationGuardParent = applicableParents.find(p => p.ruminationRiskLevel === 'high');

    return (
      <div className="space-y-6">
        {/* Rumination guard */}
        {showRuminationGuard && ruminationGuardParent?.ruminationGuardMessage && (
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-accent)]/30">
            <p className="text-[var(--color-text-primary)] mb-4">
              {ruminationGuardParent.ruminationGuardMessage}
            </p>
            <div className="space-y-2">
              {ruminationGuardParent.psCompanionTools.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ruminationGuardParent.psCompanionTools.map(toolId => (
                    <Link
                      key={toolId}
                      to={`/tool/${toolId}`}
                      className="py-2 px-3 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-sm font-medium lift-primary"
                    >
                      {toolName(toolId)}
                    </Link>
                  ))}
                </div>
              )}
              <button
                onClick={() => { setShowRuminationGuard(false); setRuminationDismissed(true); }}
                className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
              >
                No, I have a different angle
              </button>
            </div>
          </div>
        )}

        {/* Acknowledgment */}
        {!showRuminationGuard && (
          <>
            {applicableParents.map(parent => (
              <div key={parent.key} className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
                {applicableParents.length > 1 && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
                    {parent.label}
                  </p>
                )}
                <p className="text-[var(--color-text-primary)]">
                  {parent.psAcknowledgment}
                </p>
              </div>
            ))}

            {/* Problem definition prompts */}
            <div className="p-4 rounded-lg border border-[var(--color-border-subtle)]">
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                To find the problem underneath:
              </p>
              <ul className="space-y-1">
                {firstParent.problemDefinitionPrompts.map((prompt, i) => (
                  <li key={i} className="text-sm text-[var(--color-text-tertiary)]">
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>

            {/* Problem type cards */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                Which of these sounds closest?
              </p>
              {allProblemTypes.map(pt => {
                const selected = selectedProblemTypes.some(s => s.id === pt.id);
                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedProblemTypes(prev =>
                      selected ? prev.filter(s => s.id !== pt.id) : [...prev, pt]
                    )}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-fill)]/5'
                        : 'border-[var(--color-border)] lift-secondary'
                    }`}
                  >
                    <p className={`font-medium ${selected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>
                      {pt.label}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                      {pt.recognitionPrompt}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom text input */}
            <div>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-2">
                Or describe it in your own words:
              </p>
              <textarea
                value={problemDescription}
                onChange={e => setProblemDescription(e.target.value)}
                placeholder="What's the actual problem?"
                rows={3}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
              />
            </div>

            {/* Everything is piling up */}
            <button
              onClick={() => setPhase('triage')}
              className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              It's not just one thing — everything feels like too much
            </button>

            {/* Continue */}
            {(selectedProblemTypes.length > 0 || problemDescription.trim()) && (
              <button
                onClick={() => setPhase('barrier-assessment')}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
              >
                Continue
              </button>
            )}

            <button
              onClick={() => { setPhase('identify'); setPsData(null); setSelectedEmotionIds([]); }}
              className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              Change emotions
            </button>
          </>
        )}
      </div>
    );
  }

  // ─── TRIAGE ───
  if (phase === 'triage' && psData) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-primary)]">
            {psData.protocol.everythingIsPilingUpMessage}
          </p>
        </div>

        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Which of these would shift the most if you could move it even a little?
        </p>

        <div className="space-y-2">
          {allProblemTypes.map(pt => (
            <button
              key={pt.id}
              onClick={() => {
                setSelectedProblemTypes([pt]);
                setPhase('barrier-assessment');
              }}
              className="w-full text-left p-4 rounded-lg border border-[var(--color-border)] lift-secondary transition-colors"
            >
              <p className="font-medium text-[var(--color-text-primary)]">{pt.label}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{pt.recognitionPrompt}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => setPhase('define-problem')}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── BARRIER ASSESSMENT (MI CORE) ───
  if (phase === 'barrier-assessment' && psData) {
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
            {psData.protocol.barrierQuestion}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {psData.protocol.barrierQuestionSubtext}
          </p>
        </div>

        <div className="space-y-2">
          {psData.barrierTypes
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(bt => (
              <button
                key={bt.id}
                onClick={() => handleBarrierSelect(bt)}
                className="w-full text-left p-4 rounded-lg border border-[var(--color-border)] lift-secondary transition-colors"
              >
                <p className="font-medium text-[var(--color-text-primary)]">{bt.label}</p>
              </button>
            ))}
        </div>

        <button
          onClick={() => setPhase('define-problem')}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── BARRIER SUB-RESPONSES ───
  if (phase === 'barrier-sub' && psData && selectedBarrier) {
    // Show therapeutic response after sub-response is selected
    if (showTherapeuticResponse && selectedSubResponse) {
      return (
        <div className="space-y-6">
          {/* Therapeutic response */}
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-primary)]">
              {selectedSubResponse.therapeuticResponse}
            </p>
          </div>

          {/* Route based on sub-response properties */}
          {selectedSubResponse.redirectToolId && (
            <Link
              to={`/tool/${selectedSubResponse.redirectToolId}`}
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary text-center"
            >
              {toolName(selectedSubResponse.redirectToolId)}
            </Link>
          )}

          {selectedSubResponse.redirectToolIdSecondary && (
            <Link
              to={`/tool/${selectedSubResponse.redirectToolIdSecondary}`}
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-center"
            >
              {toolName(selectedSubResponse.redirectToolIdSecondary)}
            </Link>
          )}

          {selectedSubResponse.triggersAmbivalenceExploration && (
            <button
              onClick={() => setPhase('ambivalence')}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
            >
              Let's look at that
            </button>
          )}

          {selectedSubResponse.triggersConfidenceRuler && (
            <button
              onClick={() => setPhase('confidence-ruler')}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
            >
              Let's find out
            </button>
          )}

          {selectedSubResponse.routesToSolutions && (
            <button
              onClick={() => {
                setSolutionSizeHint(selectedSubResponse.solutionSizeHint);
                setPhase('solutions');
              }}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
            >
              Show me some options
            </button>
          )}

          {/* Always offer "continue problem-solving" if redirecting to a tool */}
          {(selectedSubResponse.redirectToolId && !selectedSubResponse.routesToSolutions) && (
            <button
              onClick={() => {
                setSolutionSizeHint(selectedSubResponse.solutionSizeHint);
                setPhase('solutions');
              }}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
            >
              Continue problem-solving instead
            </button>
          )}
        </div>
      );
    }

    // Show sub-response options
    return (
      <div className="space-y-6">
        {/* Demoralization validation for tried-nothing-works */}
        {selectedBarrier.id === 'tried-nothing-works' && (
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-primary)]">
              {psData.protocol.demoralizationValidation}
            </p>
          </div>
        )}

        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Can you tell me more?
        </p>

        <div className="space-y-2">
          {selectedBarrier.subResponses
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(sr => (
              <button
                key={sr.id}
                onClick={() => {
                  setSelectedSubResponse(sr);
                  setShowTherapeuticResponse(true);
                }}
                className="w-full text-left p-4 rounded-lg border border-[var(--color-border)] lift-secondary transition-colors"
              >
                <p className="font-medium text-[var(--color-text-primary)]">{sr.label}</p>
              </button>
            ))}
        </div>

        <button
          onClick={() => { setSelectedBarrier(null); setPhase('barrier-assessment'); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── AMBIVALENCE EXPLORATION ───
  if (phase === 'ambivalence' && psData && selectedSubResponse) {
    if (selectedAmbivalence) {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-primary)]">
              {selectedAmbivalence.therapeuticFollow}
            </p>
          </div>

          {selectedAmbivalence.redirectToolId && (
            <Link
              to={`/tool/${selectedAmbivalence.redirectToolId}`}
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-center"
            >
              {toolName(selectedAmbivalence.redirectToolId)}
            </Link>
          )}

          <button
            onClick={() => setPhase('solutions')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Let's keep going
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            What does staying the same protect you from?
          </h3>
        </div>

        <div className="space-y-2">
          {selectedSubResponse.ambivalenceOptions
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedAmbivalence(opt)}
                className="w-full text-left p-4 rounded-lg border border-[var(--color-border)] lift-secondary transition-colors"
              >
                <p className="font-medium text-[var(--color-text-primary)]">{opt.label}</p>
              </button>
            ))}
        </div>

        <button
          onClick={() => { setPhase('barrier-sub'); setShowTherapeuticResponse(true); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── CONFIDENCE RULER ───
  if (phase === 'confidence-ruler' && psData) {
    if (confidenceLevel) {
      const responseMap: Record<string, { response: string; tools: string[] }> = {
        high: { response: psData.protocol.confidenceHighResponse, tools: psData.protocol.confidenceHighTools },
        medium: { response: psData.protocol.confidenceMediumResponse, tools: [] },
        low: { response: psData.protocol.confidenceLowResponse, tools: psData.protocol.confidenceLowTools },
        none: { response: psData.protocol.confidenceNoneResponse, tools: psData.protocol.confidenceNoneTools },
      };
      const { response, tools } = responseMap[confidenceLevel];

      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-primary)]">
              {response}
            </p>
          </div>

          {tools.map(toolId => (
            <Link
              key={toolId}
              to={`/tool/${toolId}`}
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-center"
            >
              {toolName(toolId)}
            </Link>
          ))}

          {confidenceLevel === 'high' && (
            <button
              onClick={() => setPhase('commit')}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
            >
              I'm going to do it
            </button>
          )}

          {confidenceLevel === 'medium' && (
            <button
              onClick={() => { setSolutionSizeHint('small'); setPhase('solutions'); }}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
            >
              Show me the smallest version
            </button>
          )}

          {(confidenceLevel === 'low' || confidenceLevel === 'none') && (
            <button
              onClick={() => setPhase('solutions')}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
            >
              Continue problem-solving anyway
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)]">
            {psData.protocol.confidenceRulerIntro}
          </h3>
        </div>

        <div className="space-y-2">
          {([
            { level: 'high' as const, label: psData.protocol.confidenceHigh },
            { level: 'medium' as const, label: psData.protocol.confidenceMedium },
            { level: 'low' as const, label: psData.protocol.confidenceLow },
            { level: 'none' as const, label: psData.protocol.confidenceNone },
          ]).map(({ level, label }) => (
            <button
              key={level}
              onClick={() => setConfidenceLevel(level)}
              className="w-full text-left p-4 rounded-lg border border-[var(--color-border)] lift-secondary transition-colors"
            >
              <p className="font-medium text-[var(--color-text-primary)]">{label}</p>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setPhase('barrier-sub'); setShowTherapeuticResponse(true); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── DECOMPOSE ───
  if (phase === 'decompose' && psData) {
    if (decompositionDone) {
      const yoursAspects = decompositionAspects.filter(a => aspectBuckets[a.id] === 'yours');
      const othersAspects = decompositionAspects.filter(a => aspectBuckets[a.id] === 'others');
      const firstParent = applicableParents[0];

      if (yoursAspects.length === 0 && othersAspects.length === 0) {
        // Pure acceptance
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <p className="text-[var(--color-text-primary)]">
                {psData.protocol.decompositionNothingInYoursMessage}
              </p>
            </div>
            {psData.protocol.nothingCanChangeTools.map(toolId => (
              <Link
                key={toolId}
                to={`/tool/${toolId}`}
                className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary text-center"
              >
                {toolName(toolId)}
              </Link>
            ))}
            <button
              onClick={() => { setDecompositionDone(false); }}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
            >
              Let me reconsider
            </button>
          </div>
        );
      }

      if (yoursAspects.length === 0 && othersAspects.length > 0 && firstParent?.psInterpersonalHint) {
        // Nothing in yours, but involves others
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <p className="text-[var(--color-text-primary)]">
                {firstParent.psInterpersonalHint}
              </p>
            </div>
            <Link
              to="/tool/dear-man"
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary text-center"
            >
              {toolName('dear-man')}
            </Link>
            <Link
              to="/tool/give"
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-center"
            >
              {toolName('give')}
            </Link>
            <button
              onClick={() => setPhase('solutions')}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
            >
              Continue to solutions
            </button>
          </div>
        );
      }

      // Something in yours — go to solutions
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-primary)]">
              {psData.protocol.decompositionSomethingInYoursMessage}
            </p>
          </div>
          <button
            onClick={() => setPhase('solutions')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Let's work with that
          </button>
        </div>
      );
    }

    // Sorting interface
    const allAssigned = decompositionAspects.every(a => aspectBuckets[a.id]);
    const bucketLabels = {
      fact: 'Fact',
      others: 'Others',
      yours: 'Mine',
    };

    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-primary)]">
            {psData.protocol.decompositionIntro}
          </p>
        </div>

        <div className="space-y-3">
          {decompositionAspects
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(aspect => {
              const currentBucket = aspectBuckets[aspect.id];
              return (
                <div key={aspect.id} className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                  <p className="text-sm text-[var(--color-text-primary)] mb-3">
                    {aspect.label}
                  </p>
                  <div className="flex gap-2">
                    {(['fact', 'others', 'yours'] as const).map(bucket => {
                      const isSelected = currentBucket === bucket;
                      const isDefault = aspect.defaultBucket === bucket && !currentBucket;
                      return (
                        <button
                          key={bucket}
                          onClick={() => setAspectBuckets(prev => ({ ...prev, [aspect.id]: bucket }))}
                          className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-[var(--color-accent-fill)] border-[var(--color-accent)] text-[var(--color-on-accent)]'
                              : isDefault
                                ? 'border-[var(--color-accent)]/30 text-[var(--color-text-secondary)]'
                                : 'border-[var(--color-border)] text-[var(--color-text-tertiary)]'
                          }`}
                        >
                          {bucketLabels[bucket]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {allAssigned && (
          <button
            onClick={() => setDecompositionDone(true)}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Continue
          </button>
        )}

        <button
          onClick={() => { setSelectedBarrier(null); setPhase('barrier-assessment'); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── SOLUTIONS ───
  if (phase === 'solutions' && psData) {
    const firstParent = applicableParents[0];
    const directions = selectedProblemTypes.length > 0
      ? [...new Map(selectedProblemTypes.flatMap(pt => pt.solutionDirections).map(d => [d.id, d])).values()]
      : firstParent?.problemTypes[0]?.solutionDirections
      ?? [];

    return (
      <div className="space-y-6">
        {solutionSizeHint === 'small' && (
          <div className="p-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Let's start with the smallest version.
            </p>
          </div>
        )}

        {selectedBarrier?.id === 'outside-control' && (
          <div className="p-4 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Focused on the parts within your hands.
            </p>
          </div>
        )}

        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Which direction feels right?
        </p>

        <div className="space-y-2">
          {directions.map(dir => (
            <button
              key={dir.id}
              onClick={() => {
                setSelectedDirection(dir);
                setPhase('commit');
              }}
              className="w-full text-left p-4 rounded-lg border border-[var(--color-border)] lift-secondary transition-colors"
            >
              <p className="font-medium text-[var(--color-text-primary)]">{dir.label}</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{dir.description}</p>
              {dir.linkedToolId && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]">
                  Uses {getToolById(dir.linkedToolId)?.name ?? dir.linkedToolId}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setSolutionSizeHint(null);
            if (selectedBarrier) {
              setPhase('barrier-assessment');
            } else {
              setPhase('define-problem');
            }
          }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── COMMIT ───
  if (phase === 'commit' && psData) {
    const framingLabels = psData.protocol.commitmentFraming;

    // Special case: know-but-cant path where user didn't go through solutions
    const isKnowButCantDirect = selectedBarrier?.id === 'know-but-cant' && !selectedDirection;
    if (isKnowButCantDirect) {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
              What's the step you already know you need to take?
            </h3>
            <textarea
              value={customStepText}
              onChange={e => setCustomStepText(e.target.value)}
              placeholder="The thing I need to do..."
              rows={2}
              className="w-full mt-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            />
          </div>

          <div className="space-y-2">
            {(['small', 'medium', 'bigger'] as const).map((size, i) => {
              const sizeLabels = { small: 'Small version', medium: 'Medium version', bigger: 'Full version' };
              const colors = {
                small: 'border-[var(--color-border)] lift-secondary',
                medium: 'border-[var(--color-border-accent)] lift-secondary',
                bigger: 'border-[var(--color-accent)] lift-secondary',
              };
              const selected = chosenSize === size;

              return (
                <button
                  key={size}
                  onClick={() => setChosenSize(size)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-bg-elevated)]'
                      : colors[size]
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    {framingLabels[i] || sizeLabels[size]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-sm text-[var(--color-text-tertiary)]">
            {psData.protocol.commitmentValidation}
          </p>

          {chosenSize && customStepText.trim() && (
            <button
              onClick={() => setPhase('complete')}
              className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
            >
              I'm going to do this
            </button>
          )}
        </div>
      );
    }

    // Standard commit with selected direction
    if (!selectedDirection) return null;

    return (
      <div className="space-y-6">
        <div className="p-5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <p className="font-medium text-[var(--color-text-primary)]">
            {selectedDirection.label}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Pick what feels doable:
          </p>
        </div>

        <div className="space-y-2">
          {(['small', 'medium', 'bigger'] as const).map((size, i) => {
            const sizeLabels = { small: 'Small step', medium: 'Medium step', bigger: 'Bigger step' };
            const colors = {
              small: 'border-[var(--color-border)] lift-secondary',
              medium: 'border-[var(--color-border-accent)] lift-secondary',
              bigger: 'border-[var(--color-accent)] lift-secondary',
            };
            const selected = chosenSize === size;

            return (
              <button
                key={size}
                onClick={() => setChosenSize(size)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selected
                    ? 'border-[var(--color-accent)] bg-[var(--color-bg-elevated)]'
                    : colors[size]
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                  {framingLabels[i] || sizeLabels[size]}
                </span>
                <p className="text-[var(--color-text-primary)] mt-1">
                  {selectedDirection[size]}
                </p>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-[var(--color-text-tertiary)]">
          {psData.protocol.commitmentValidation}
        </p>

        {chosenSize && (
          <button
            onClick={() => setPhase('complete')}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            I'm going to do this
          </button>
        )}

        <button
          onClick={() => { setChosenSize(null); setPhase('solutions'); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Pick a different direction
        </button>
      </div>
    );
  }

  // ─── COMPLETE ───
  if (phase === 'complete' && psData && chosenSize) {
    const isKnowButCantDirect = selectedBarrier?.id === 'know-but-cant' && !selectedDirection;
    const stepText = isKnowButCantDirect
      ? customStepText
      : selectedDirection?.[chosenSize] ?? '';
    const showCopeAhead = chosenSize === 'medium' || chosenSize === 'bigger';

    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)]">
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">&#x1F6E0;&#xFE0F;</span>
        <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">
          {psData.protocol.completionAcknowledgment}
        </h3>

        <div className="p-4 rounded-lg bg-[var(--color-bg-secondary)] mb-4">
          <p className="text-sm font-medium text-[var(--color-text-tertiary)] mb-1">
            Your next step
          </p>
          <p className="text-[var(--color-text-primary)]">
            "{stepText}"
          </p>
        </div>

        {selectedDirection?.linkedToolId && (
          <Link
            to={`/tool/${selectedDirection.linkedToolId}`}
            state={{ checkinEmotions: selectedEmotionIds }}
            className="inline-block mb-4 text-sm text-[var(--color-accent)] hover:underline"
          >
            This step uses {getToolById(selectedDirection.linkedToolId)?.name ?? selectedDirection.linkedToolId} &rarr;
          </Link>
        )}

        {showCopeAhead && (
          <div className="mb-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              {psData.protocol.copeAheadBridge}
            </p>
            <Link
              to={`/tool/${psData.protocol.copeAheadBridgeToolId}`}
              className="inline-block py-2 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm lift-secondary"
            >
              {toolName(psData.protocol.copeAheadBridgeToolId)}
            </Link>
          </div>
        )}

        <p className="text-sm text-[var(--color-text-tertiary)] mb-6">
          {psData.protocol.completionFollowUp}
        </p>

        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="py-2 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary"
          >
            Start over
          </button>
          <button
            onClick={() => navigate('/')}
            className="py-2 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
