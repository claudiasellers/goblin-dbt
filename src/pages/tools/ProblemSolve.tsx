import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { emotions, getEmotionById, getEmotionByName } from '../../data/emotions';
import { getToolById } from '../../data/tools';
import {
  getProblemSolveContent,
  type ProblemSolveContent,
  type ProblemTypeData,
  type SolutionDirectionData,
} from '../../services/neo4j';

type Phase =
  | 'intro'
  | 'identify'
  | 'loading'
  | 'readiness-check'
  | 'redirect'
  | 'define-problem'
  | 'triage'
  | 'changeability'
  | 'solutions'
  | 'commit'
  | 'complete';

const familyLabels: Record<string, string> = {
  fearful: 'Fearful',
  angry: 'Angry',
  sad: 'Sad',
  disgusted: 'Disgusted',
  bad: 'Bad',
  happy: 'Happy',
  surprised: 'Surprised',
};

const familyOrder = ['fearful', 'angry', 'sad', 'disgusted', 'bad', 'happy', 'surprised'];

// Parents that are inherently interpersonal (always show interpersonal hint)
const interpersonalParents = new Set(['anger', 'jealousy', 'love']);

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
  const [search, setSearch] = useState('');
  const [showPleasant, setShowPleasant] = useState(false);

  // Graph data
  const [psData, setPsData] = useState<ProblemSolveContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User input state
  const [problemDescription, setProblemDescription] = useState('');
  const [selectedProblemType, setSelectedProblemType] = useState<ProblemTypeData | null>(null);
  const [changeabilityAnswer, setChangeabilityAnswer] = useState<'yes' | 'some' | 'no' | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<SolutionDirectionData | null>(null);
  const [chosenSize, setChosenSize] = useState<'small' | 'medium' | 'bigger' | null>(null);
  const [showInterpersonalHint, setShowInterpersonalHint] = useState(true);

  // Rumination guard
  const [defineEntryCount, setDefineEntryCount] = useState(0);
  const [showRuminationGuard, setShowRuminationGuard] = useState(false);
  const [ruminationDismissed, setRuminationDismissed] = useState(false);

  // Readiness redirect
  const [showReadinessRedirect, setShowReadinessRedirect] = useState(false);

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
      setError('Could not load problem-solving content. Please try again.');
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

  // Auto-advance from changeability to solutions when no interpersonal hint
  useEffect(() => {
    if (phase !== 'changeability' || !psData) return;
    if (changeabilityAnswer !== 'yes' && changeabilityAnswer !== 'some') return;
    const firstParent = applicableParents[0];
    const hasInterpersonal = showInterpersonalHint && firstParent?.psInterpersonalHint && (
      interpersonalParents.has(firstParent.key) || problemDescription.trim().length > 0
    );
    if (!hasInterpersonal) {
      setPhase('solutions');
    }
  }, [phase, changeabilityAnswer, psData, applicableParents, showInterpersonalHint, problemDescription]);

  // All problem types across applicable parents
  const allProblemTypes = useMemo(
    () => applicableParents.flatMap(p => p.problemTypes),
    [applicableParents]
  );

  // Grouped emotions for identify phase
  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? emotions.filter(e => e.name.toLowerCase().includes(q))
      : emotions;
    const unpleasant = ['fearful', 'angry', 'sad', 'disgusted', 'bad'];
    const groups: Record<string, typeof emotions> = {};
    for (const fam of familyOrder) {
      if (!showPleasant && !q && !unpleasant.includes(fam)) continue;
      const members = filtered.filter(e => e.family === fam);
      if (members.length > 0) groups[fam] = members;
    }
    return groups;
  }, [search, showPleasant]);

  // ── Actions ──

  const toggleEmotion = (id: string) => {
    setSelectedEmotionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const continueFromIdentify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProblemSolveContent(selectedEmotionIds);
      setPsData(data);
      const hasApplicable = data.emotions.some(e => e.applicable);
      setPhase(hasApplicable ? 'readiness-check' : 'redirect');
    } catch {
      setError('Could not load problem-solving content. Please try again.');
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
    setSearch('');
    setShowPleasant(false);
    setPsData(null);
    setError(null);
    setProblemDescription('');
    setSelectedProblemType(null);
    setChangeabilityAnswer(null);
    setSelectedDirection(null);
    setChosenSize(null);
    setShowInterpersonalHint(true);
    setDefineEntryCount(0);
    setShowRuminationGuard(false);
    setRuminationDismissed(false);
    setShowReadinessRedirect(false);
  };

  // ── Helpers ──

  const toolName = (id: string) => {
    const t = getToolById(id);
    return t ? `${t.emoji} ${t.name}` : id;
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
            This tool helps when your emotion is telling you something real — there's an actual problem to address. We'll figure out what the problem is, what you can change, and pick one concrete next step.
          </p>
        </div>
        <button
          onClick={() => setPhase('identify')}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
        >
          Let's start
        </button>
      </div>
    );
  }

  // ─── IDENTIFY ───
  if (phase === 'identify') {
    return (
      <div className="space-y-5">
        <p className="text-[var(--color-text-secondary)]">
          What are you feeling right now?{' '}
          <span className="text-sm text-[var(--color-text-tertiary)]">Select all that apply.</span>
        </p>

        <input
          type="text"
          placeholder="Search emotions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-input)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped).map(([family, members]) => (
            <div key={family}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
                {familyLabels[family] ?? family}
              </h4>
              <div className="flex flex-wrap gap-2">
                {members.map(e => {
                  const selected = selectedEmotionIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEmotion(e.id)}
                      disabled={loading}
                      className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                        selected
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary'
                      }`}
                    >
                      {e.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {!search && !showPleasant && (
          <button
            onClick={() => setShowPleasant(true)}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            + Show pleasant emotions too
          </button>
        )}

        {error && (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        )}

        {selectedEmotionIds.length > 0 && (
          <button
            onClick={continueFromIdentify}
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : `Continue with ${selectedEmotionIds.length === 1
                  ? getEmotionById(selectedEmotionIds[0])?.name
                  : `${selectedEmotionIds.length} emotions`}`}
          </button>
        )}
      </div>
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
              className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary text-center"
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
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
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary text-center"
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
                      className="py-2 px-3 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium lift-primary"
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
                const selected = selectedProblemType?.id === pt.id;
                return (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedProblemType(selected ? null : pt)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
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
            {(selectedProblemType || problemDescription.trim()) && (
              <button
                onClick={() => setPhase('changeability')}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
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
                setSelectedProblemType(pt);
                setPhase('changeability');
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

  // ─── CHANGEABILITY ───
  if (phase === 'changeability' && psData) {
    const firstParent = applicableParents[0];
    const showInterpersonal = showInterpersonalHint && firstParent && firstParent.psInterpersonalHint && (
      interpersonalParents.has(firstParent.key) || problemDescription.trim().length > 0
    );

    // If "no" was selected, show acceptance tools
    if (changeabilityAnswer === 'no') {
      return (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <p className="text-[var(--color-text-primary)]">
              {psData.protocol.nothingCanChangeMessage}
            </p>
          </div>
          {psData.protocol.nothingCanChangeTools.map(toolId => (
            <Link
              key={toolId}
              to={`/tool/${toolId}`}
              className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary text-center"
            >
              {toolName(toolId)}
            </Link>
          ))}
          <button
            onClick={() => { setChangeabilityAnswer(null); }}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Actually, let me reconsider
          </button>
        </div>
      );
    }

    // If answered yes/some, show interpersonal check then go to solutions
    if (changeabilityAnswer === 'yes' || changeabilityAnswer === 'some') {
      if (showInterpersonal) {
        return (
          <div className="space-y-6">
            {changeabilityAnswer === 'some' && firstParent && (
              <div className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {firstParent.cannotChangeGuidance}
                </p>
              </div>
            )}
            <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
              <p className="text-[var(--color-text-primary)]">
                {firstParent!.psInterpersonalHint}
              </p>
            </div>
            <Link
              to={`/tool/${psData.protocol.interpersonalRedirectTools[0] ?? 'dear-man'}`}
              state={{ checkinEmotions: selectedEmotionIds }}
              className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary text-center"
            >
              Work on the conversation instead
            </Link>
            <button
              onClick={() => { setShowInterpersonalHint(false); setPhase('solutions'); }}
              className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
            >
              No, I want to problem-solve this
            </button>
          </div>
        );
      }

    }

    // Default: show changeability questions
    return (
      <div className="space-y-6">
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-3">
            What can change here?
          </h3>
          <ul className="space-y-2">
            {psData.protocol.changeabilityQuestions.map((q, i) => (
              <li key={i} className="text-[var(--color-text-secondary)]">
                {q}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={() => setChangeabilityAnswer('yes')}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
        >
          Yes, I can change some of this
        </button>
        <button
          onClick={() => setChangeabilityAnswer('some')}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
        >
          Parts of it, not all
        </button>
        <button
          onClick={() => setChangeabilityAnswer('no')}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-tertiary)] font-medium lift-secondary"
        >
          No, nothing can change
        </button>

        <button
          onClick={() => { setPhase('define-problem'); }}
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
    // Use selected problem type's directions, or fall back to first problem type's
    const directions = selectedProblemType?.solutionDirections
      ?? firstParent?.problemTypes[0]?.solutionDirections
      ?? [];

    return (
      <div className="space-y-6">
        {/* Cannot-change banner for "some" */}
        {changeabilityAnswer === 'some' && firstParent && (
          <div className="p-4 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {firstParent.cannotChangeGuidance}
            </p>
          </div>
        )}

        <p className="text-sm font-medium text-[var(--color-text-secondary)]">
          Which direction feels right?
        </p>

        <div className="space-y-2">
          {directions.map(dir => {
            const selected = selectedDirection?.id === dir.id;
            return (
              <button
                key={dir.id}
                onClick={() => {
                  setSelectedDirection(dir);
                  setPhase('commit');
                }}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-border)] lift-secondary'
                }`}
              >
                <p className="font-medium text-[var(--color-text-primary)]">{dir.label}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{dir.description}</p>
                {dir.linkedToolId && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]">
                    Uses {getToolById(dir.linkedToolId)?.name ?? dir.linkedToolId}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => { setPhase('define-problem'); }}
          className="w-full text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  // ─── COMMIT ───
  if (phase === 'commit' && psData && selectedDirection) {
    const framingLabels = psData.protocol.commitmentFraming;

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
            className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
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
  if (phase === 'complete' && psData && selectedDirection && chosenSize) {
    const stepText = selectedDirection[chosenSize];
    const showCopeAhead = chosenSize === 'medium' || chosenSize === 'bigger';

    return (
      <div className="text-center p-8 rounded-xl bg-[var(--color-bg-elevated)]">
        <span className="text-4xl mb-4 block" role="img" aria-hidden="true">🛠️</span>
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

        {selectedDirection.linkedToolId && (
          <Link
            to={`/tool/${selectedDirection.linkedToolId}`}
            state={{ checkinEmotions: selectedEmotionIds }}
            className="inline-block mb-4 text-sm text-[var(--color-accent)] hover:underline"
          >
            This step uses {getToolById(selectedDirection.linkedToolId)?.name ?? selectedDirection.linkedToolId} →
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
            className="py-2 px-4 rounded-lg bg-[var(--color-accent)] text-white font-medium lift-primary"
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
