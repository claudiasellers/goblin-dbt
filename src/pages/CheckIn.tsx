import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { QuadrantGrid } from '../components/checkin/QuadrantGrid';
import { BodyMap } from '../components/checkin/BodyMap';
import { SensationDetails } from '../components/checkin/SensationDetails';
import { StateResult } from '../components/checkin/StateResult';
import { LowEnergyStateResult } from '../components/checkin/LowEnergyStateResult';
import { EmotionSuggestion } from '../components/checkin/EmotionSuggestion';
import { DiscriminatingQuestions } from '../components/checkin/DiscriminatingQuestions';
import {
  saveCheckIn,
  setCheckInNextAction,
  getStateAndTools,
  getDiscriminatingQuestions,
  type StateResult as StateResultType,
  type DiscriminatingQuestion,
} from '../services/neo4j';
import { getEmotionById, getEmotionByName } from '../data/emotions';
import { FindTheFeeling, type FindTheFeelingResult } from './tools/FindTheFeeling';
import { TodayStack } from '../components/today/TodayStack';
import { HelpNowInterim } from '../components/checkin/HelpNowInterim';
import { newId } from '../lib/spine/ids';
import {
  buildCheckInPayload,
  ftfReading,
  type CheckInNextAction,
  type CheckInSource,
} from '../lib/spine/checkInPayload';
import type { CapacityReading } from '../data/capacityTypes';
import { recordToolSession } from '../services/spine';
import { useBand } from '../hooks/useBand';
import { BandGate } from '../components/capacity/BandGate';
import { bandStepFor, checkInIntensity } from '../lib/checkInBand';

type EntryPoint = 'standard' | 'somatic';

type CheckInStep =
  | 'emotion'
  | 'help_now'
  | 'find'
  | 'discriminating'
  | 'capacity'
  | 'body'
  | 'sensation'
  | 'suggestion'
  | 'analyzing'
  | 'result'
  | 'saving'
  | 'complete';

interface BodySensation {
  x: number;
  y: number;
  region: string;
  intensity: { x: number; y: number };
  tags: string[];
}

export interface CheckInData {
  quadrant: string | null;
  emotions: string[];
  intensity: { x: number; y: number } | null;
  bodySensations: BodySensation[];
  note: string;
  timestamp: Date;
}

export function CheckIn() {
  const { user } = useAuth();
  const [step, setStep] = useState<CheckInStep>('emotion');
  const [entryPoint, setEntryPoint] = useState<EntryPoint>('standard');
  const [checkInData, setCheckInData] = useState<CheckInData>({
    quadrant: null,
    emotions: [],
    intensity: null,
    bodySensations: [],
    note: '',
    timestamp: new Date(),
  });
  const [currentSensation, setCurrentSensation] = useState<Partial<BodySensation> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stateResult, setStateResult] = useState<StateResultType | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [discriminatingQuestions, setDiscriminatingQuestions] = useState<DiscriminatingQuestion[]>([]);
  const [discriminatingAnswers, setDiscriminatingAnswers] = useState<Array<{ questionId: string; responseId: string }>>([]);

  // === Continuity (PR-C1) ===
  // One client id per check-in, minted when the flow starts and reset in handleComplete. The result
  // is saved when it renders (crisis-banner results included) and re-saved by the same id after
  // "add more detail"; what the user does next is recorded against it (setCheckInNextAction).
  const [checkInId, setCheckInId] = useState<string>(() => newId());
  const [startedAt, setStartedAt] = useState<Date>(() => new Date());
  const [source, setSource] = useState<CheckInSource>('grid');
  const [capacity, setCapacityState] = useState<CapacityReading | null>(null);
  // === Band (A4-3) ===
  // Unpleasant check-ins carry a band: this check-in's own answer, or a current one carried
  // (≤ 20 min, e.g. from Find the feeling), else the probe step asks. Pleasant: no band (D-07).
  const band = useBand();
  const capacityRef = useRef<CapacityReading | null>(null);
  const setCapacity = (r: CapacityReading | null) => { capacityRef.current = r; setCapacityState(r); };
  const [askedCapacity, setAskedCapacity] = useState(false);
  /** Where the probe step goes next: the body map (standard) or straight to analysis (somatic). */
  const afterCapacity = useRef<{ then: 'body' | 'analyze'; overrides?: { quadrant?: string; emotions?: string[] } }>({ then: 'body' });
  useEffect(() => { if (user) band.load(); }, [user, band]);
  const [knownEmotionIds, setKnownEmotionIds] = useState<string[]>([]);
  const [embeddedIds, setEmbeddedIds] = useState<string[]>([]);
  /** The render save in flight: resolves true when saved. Next actions chain after it. */
  const savePromise = useRef<Promise<boolean> | null>(null);
  const savedResult = useRef<StateResultType | null>(null);

  const emotionX = (emotions: string[]) => (emotions.length ? getEmotionByName(emotions[0])?.x : undefined);
  const intensityFor = (cap: CapacityReading | null, emotions: string[]) =>
    checkInIntensity(cap, band.content, emotionX(emotions), checkInData.intensity);

  const payloadState = () => ({
    id: checkInId,
    quadrant: checkInData.quadrant ?? 'high-unpleasant',
    emotions: checkInData.emotions,
    emotionIds: knownEmotionIds,
    intensity: intensityFor(capacity, checkInData.emotions),
    bodySensations: checkInData.bodySensations,
    note: checkInData.note,
    startedAt,
    source,
    capacity,
    discriminatingAnswers,
    embeddedToolSessionIds: embeddedIds,
  });

  // Save on result render, before any tool can open (R4: every downstream write keys on this id).
  useEffect(() => {
    if (!user || step !== 'result' || !stateResult || !checkInData.quadrant) return;
    if (savedResult.current === stateResult) return;
    savedResult.current = stateResult;
    savePromise.current = saveCheckIn(buildCheckInPayload(payloadState(), stateResult))
      .then(() => true)
      .catch((err) => {
        console.error('Failed to save check-in:', err);
        return false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, step, stateResult]);

  /**
   * Record the next action once the render save settled. If that save failed, save again with the
   * next action inline (same id, so nothing duplicates). Resolves true when recorded.
   */
  function recordNextAction(next: CheckInNextAction): Promise<boolean> {
    const id = checkInId;
    const state = payloadState();
    const result = stateResult;
    const pending = savePromise.current ?? Promise.resolve(false);
    return pending.then((saved) => (saved
      ? setCheckInNextAction(id, next)
      : saveCheckIn(buildCheckInPayload(state, result, next)).then(() => undefined)))
      .then(() => true)
      .catch((err) => {
        console.error('Failed to record next action:', err);
        return false;
      });
  }

  /** A tool card tap: fire-and-forget; navigation never waits. */
  function handleToolOpen(toolId: string) {
    if (!user || !checkInData.quadrant) return;
    void recordNextAction({ kind: 'tool', toolId });
  }

  // Signed-out entry: tools are available right now; an account only adds saved check-ins.
  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <span className="text-5xl mb-4 block" aria-hidden="true">🌿</span>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          What would help right now?
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Try a tool, or create an account to save your check-ins and notice patterns over time.
        </p>
        <div className="space-y-3">
          <Link
            to="/tools"
            className="block w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Find a tool
          </Link>
          <Link
            to="/signup"
            className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
          >
            Create account
          </Link>
        </div>
        <p className="mt-5 text-sm text-[var(--color-text-secondary)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--color-accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  /**
   * Analyze the current state and get recommendations.
   * Accepts optional overrides so callers that just called setState
   * (which won't have flushed yet) can pass the fresh values directly.
   */
  async function analyzeAndShowResult(overrides?: { quadrant?: string; emotions?: string[]; discAnswers?: Array<{ questionId: string; responseId: string }>; capacity?: CapacityReading | null }) {
    const quadrant = overrides?.quadrant ?? checkInData.quadrant;
    const emotions = overrides?.emotions ?? checkInData.emotions;
    const discAnsw = overrides?.discAnswers ?? discriminatingAnswers;
    const cap = overrides && 'capacity' in overrides ? overrides.capacity ?? null : capacityRef.current;
    if (!quadrant) return;

    setStep('analyzing');
    setAnalyzeError(null);

    try {
      const result = await getStateAndTools({
        quadrant,
        emotions: emotions.length > 0 ? emotions : undefined,
        intensity: intensityFor(cap, emotions) || undefined,
        bodySensations: checkInData.bodySensations.length > 0
          ? checkInData.bodySensations.map(s => ({ region: s.region, tags: s.tags }))
          : undefined,
        discriminatingAnswers: discAnsw.length > 0 ? discAnsw : undefined,
        ...(cap ? { band: cap.value, bandViaCantTell: cap.viaCantTell } : {}),
      });
      
      setStateResult(result);
      setStep('result');
    } catch (error) {
      console.error('Failed to analyze state:', error);
      setAnalyzeError(null);
      setStateResult(null);
      setStep('saving');
      try {
        if (user) {
          // Analysis failed: save what the user told us, without a pattern (idempotent by id).
          await saveCheckIn(buildCheckInPayload({ ...payloadState(), quadrant, emotions }, null, { kind: 'done' }));
        }
        setStep('complete');
      } catch (saveErr) {
        console.error('Failed to save check-in:', saveErr);
        setSaveError('Check-in recorded locally but could not sync.');
        setStep('complete');
      }
    }
  }

  /**
   * "Help me now" (PR-C2, D-08 interim): a safe body step and two quiet links. No check-in and no
   * routing call: nothing was said about the feeling, so nothing is guessed.
   */
  function handleHelpMeNow() {
    setStep('help_now');
  }

  /**
   * "I don't know how I feel" - start with body sensations instead
   */
  function handleSomaticEntry() {
    setStartedAt(new Date()); // the check-in's time is when it starts, not when the screen mounted
    setSource('body');
    setEntryPoint('somatic');
    setStep('body');
  }

  /**
   * Back from Find the feeling (check-in mode). A found word becomes the check-in emotion and the
   * capacity band sets intensity; no word falls back to the body-first path.
   */
  function handleFound(r: FindTheFeelingResult) {
    // FTF's band is this check-in's capacity answer (kept, not just turned into intensity).
    setSource('ftf');
    // FTF recorded its answer in the band store (context 'checkin'); use that reading so its id
    // matches, else build the same reading here.
    const current = band.current();
    const fromFtf = current && current.source === 'ftf' && current.context === 'checkin' && current.value === r.band ? current : null;
    setCapacity(fromFtf ?? ftfReading(newId(), r.band));
    if (r.toolSessionId) setEmbeddedIds([r.toolSessionId]);
    const emotion = r.emotionId ? getEmotionById(r.emotionId) : undefined;
    if (emotion) setKnownEmotionIds([emotion.id]);
    if (!emotion) {
      setCheckInData(prev => ({ ...prev, intensity: { x: 0.5, y: r.intensityY } }));
      setEntryPoint('somatic');
      setStep('body');
      return;
    }
    const intensity = { x: emotion.x ?? 0.5, y: r.intensityY };
    setCheckInData(prev => ({ ...prev, intensity }));
    void handleEmotionSelect([emotion.name]);
  }

  /**
   * User selected emotions from the somatic suggestion screen
   */
  function handleSuggestionSelect(emotions: string[], quadrant: string) {
    setCheckInData(prev => ({ ...prev, emotions, quadrant }));
    afterFeelings(quadrant, 'analyze', { quadrant, emotions });
  }

  /**
   * User wants to browse the full emotion list instead of using suggestions
   */
  function handleShowAllEmotions() {
    setEntryPoint('standard');
    setStep('emotion');
  }

  /**
   * Skip from suggestion straight to analysis with body data only
   */
  function handleSuggestionSkip() {
    const quadrant = checkInData.quadrant || 'high-unpleasant';
    setCheckInData(prev => ({ ...prev, quadrant }));
    afterFeelings(quadrant, 'analyze', { quadrant });
  }

  /**
   * The feelings are in (grid, discriminating questions or somatic suggestions). Unpleasant: keep this
   * check-in's band, carry a current one, or ask (the `capacity` step). Then the body map (standard)
   * or the analysis (somatic, which has already been through the body map).
   */
  function afterFeelings(quadrant: string | null, then: 'body' | 'analyze', overrides?: { quadrant?: string; emotions?: string[] }) {
    const d = bandStepFor(quadrant, capacityRef.current, band.current());
    if (d.next === 'capacity') {
      afterCapacity.current = { then, overrides };
      setAskedCapacity(true);
      setStep('capacity');
      return;
    }
    const cap = d.carry ? band.carry('checkin') : d.keep;
    setCapacity(cap);
    if (then === 'body') setStep('body');
    else void analyzeAndShowResult({ ...overrides, capacity: cap });
  }

  function handleBand(r: CapacityReading | null) {
    setCapacity(r);
    const { then, overrides } = afterCapacity.current;
    if (then === 'body') setStep('body');
    else void analyzeAndShowResult({ ...overrides, capacity: r });
  }

  function inferQuadrant(selectedEmotions: string[]): string {
    const counts: Record<string, number> = {};
    for (const name of selectedEmotions) {
      const emotion = getEmotionByName(name);
      if (emotion) {
        counts[emotion.quadrant] = (counts[emotion.quadrant] || 0) + 1;
      }
    }
    // Tie-break: unpleasant wins (distress tools more relevant), high wins
    const priority = ['high-unpleasant', 'low-unpleasant', 'high-pleasant', 'low-pleasant'];
    let best = priority[0];
    let bestCount = 0;
    for (const q of priority) {
      if ((counts[q] || 0) > bestCount) {
        best = q;
        bestCount = counts[q] || 0;
      }
    }
    return best;
  }

  async function handleEmotionSelect(emotions: string[]) {
    const inferredQuadrant = inferQuadrant(emotions);
    setCheckInData(prev => ({ ...prev, emotions, quadrant: inferredQuadrant }));

    // For low-unpleasant, try to fetch discriminating questions
    if (inferredQuadrant === 'low-unpleasant') {
      try {
        const questions = await getDiscriminatingQuestions('low-unpleasant');
        if (questions.length > 0) {
          setDiscriminatingQuestions(questions);
          setStep('discriminating');
          return;
        }
      } catch (err) {
        console.error('Failed to fetch discriminating questions, skipping:', err);
      }
    }

    afterFeelings(inferredQuadrant, 'body');
  }

  function handleDiscriminatingComplete(answers: Array<{ questionId: string; responseId: string }>) {
    setDiscriminatingAnswers(answers);
    afterFeelings(checkInData.quadrant, 'body');
  }

  function handleDiscriminatingSkip() {
    afterFeelings(checkInData.quadrant, 'body');
  }

  function handleBodyTap(x: number, y: number, region: string) {
    setCurrentSensation({ x, y, region });
    setStep('sensation');
  }

  function handleSensationComplete(sensation: BodySensation) {
    setCheckInData(prev => ({
      ...prev,
      bodySensations: [...prev.bodySensations, sensation],
    }));
    setCurrentSensation(null);
    setStep('body');
  }

  async function handleSkipBody() {
    if (entryPoint === 'somatic') {
      // No sensations recorded in somatic flow — go to full emotion picker
      handleShowAllEmotions();
      return;
    }
    await analyzeAndShowResult();
  }

  async function handleBodyComplete() {
    if (entryPoint === 'somatic') {
      setStep('suggestion');
      return;
    }
    await analyzeAndShowResult();
  }

  /**
   * Done, micro-step done, or guided activity done / exited early. The check-in was saved when the
   * result rendered; this records what happened next, then shows the saved screen.
   */
  async function handleResultDone(next: CheckInNextAction = { kind: 'done' }) {
    if (!user || !checkInData.quadrant) {
      handleComplete();
      return;
    }

    setStep('saving');
    setSaveError(null);
    const ok = await recordNextAction(next);
    if (!ok) setSaveError('Failed to save your check-in. It will be stored locally.');
    recordOneShot(next);
    setStep('complete');
  }

  /** Micro-steps and guided activities are practice too: a one-shot ToolSession (PR-S3). No rep yet. */
  function recordOneShot(next: CheckInNextAction) {
    const patternId = stateResult?.pattern?.id;
    const core: Record<string, string> = {};
    if (patternId) core.patternId = patternId;
    if (next.kind === 'micro_step') {
      if (next.microStepId) core.microStepId = next.microStepId;
      void recordToolSession({
        id: newId(), toolId: 'micro-step', entry: 'checkin_result', checkInId, status: 'completed',
        ...(patternId ? { patternId } : {}), ext: { core },
      }).catch(() => { /* best effort */ });
    } else if (next.kind === 'activity' || next.kind === 'activity_partial') {
      if (next.activityId) core.activityId = next.activityId;
      void recordToolSession({
        id: newId(), toolId: 'guided-activity', entry: 'checkin_result', checkInId,
        status: next.kind === 'activity' ? 'completed' : 'exited_early',
        ...(patternId ? { patternId } : {}), ext: { core },
      }).catch(() => { /* best effort */ });
    }
  }

  /**
   * Go back to add more detail from the result screen
   */
  function handleAddMoreDetail() {
    // Go back to the next unfilled step
    if (checkInData.emotions.length === 0) {
      setStep('emotion');
    } else {
      setStep('body');
    }
  }

  function handleComplete() {
    setCheckInId(newId());
    setStartedAt(new Date());
    savePromise.current = null;
    savedResult.current = null;
    setSource('grid');
    setCapacity(null);
    setAskedCapacity(false);
    afterCapacity.current = { then: 'body' };
    setKnownEmotionIds([]);
    setEmbeddedIds([]);
    setCheckInData({
      quadrant: null,
      emotions: [],
      intensity: null,
      bodySensations: [],
      note: '',
      timestamp: new Date(),
    });
    setSaveError(null);
    setStateResult(null);
    setAnalyzeError(null);
    setEntryPoint('standard');
    setDiscriminatingQuestions([]);
    setDiscriminatingAnswers([]);
    setStep('emotion');
  }

  function handleBack() {
    switch (step) {
      case 'help_now':
        setStep('emotion');
        break;
      case 'discriminating':
        setStep('emotion');
        break;
      case 'capacity':
        if (afterCapacity.current.then === 'analyze') setStep('suggestion');
        else if (discriminatingQuestions.length > 0 && checkInData.quadrant === 'low-unpleasant') setStep('discriminating');
        else setStep('emotion');
        break;
      case 'body':
        if (entryPoint !== 'somatic' && askedCapacity && capacity?.source === 'probe') {
          setStep('capacity');
        } else if (entryPoint === 'somatic') {
          setEntryPoint('standard');
          setStep('emotion');
        } else if (discriminatingQuestions.length > 0 && checkInData.quadrant === 'low-unpleasant') {
          setStep('discriminating');
        } else {
          setStep('emotion');
        }
        break;
      case 'sensation':
        setCurrentSensation(null);
        setStep('body');
        break;
      case 'suggestion':
        setStep('body');
        break;
      case 'result':
        handleAddMoreDetail();
        break;
      case 'complete':
        setStep('result');
        break;
    }
  }

  const stepOrder = entryPoint === 'somatic'
    ? ['body', 'suggestion', ...(askedCapacity ? ['capacity'] : [])]
    : [
      'emotion',
      ...(discriminatingQuestions.length > 0 ? ['discriminating'] : []),
      ...(askedCapacity ? ['capacity'] : []),
      'body',
    ];
  const currentStepIndex = stepOrder.indexOf(step);
  const showProgress = currentStepIndex >= 0 && currentStepIndex < stepOrder.length;

  return (
    <div>
      {/* Today (PR-S5): follow-ups, "did it help?", OA plans. Only before a new check-in starts,
          so never beside a result or the crisis banner. */}
      {step === 'emotion' && <TodayStack />}

      {/* Progress indicator - subtle, shows optionality */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            {stepOrder.map((s, i) => (
              <div
                key={s}
                className={`
                  h-1.5 rounded-full transition-all duration-300
                  ${i <= currentStepIndex ? 'bg-[var(--color-accent-fill)]' : 'bg-[var(--color-bg-secondary)]'}
                  ${i === currentStepIndex ? 'w-8' : 'w-4'}
                `}
              />
            ))}
          </div>
          <p className="text-xs text-center text-[var(--color-text-tertiary)] mt-2">
            {entryPoint === 'somatic'
              ? (currentStepIndex === 0 ? 'Start here' : 'Almost there')
              : (currentStepIndex === 0 ? 'Start here' : 'Optional — tap "Help me now" anytime')
            }
          </p>
        </div>
      )}

      {/* Back button for steps after first */}
      {step !== 'emotion' && step !== 'analyzing' && step !== 'saving' && step !== 'complete' && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4 transition-colors"
        >
          <span>←</span>
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {/* Error display */}
      {analyzeError && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)] text-sm">
          {analyzeError}
        </div>
      )}

      <div key={step} className="step-enter">
        {step === 'emotion' && (
          <QuadrantGrid
            onSelect={(emotions) => { setStartedAt(new Date()); setSource('grid'); setKnownEmotionIds([]); void handleEmotionSelect(emotions); }}
            onHelpMeNow={handleHelpMeNow}
            onSomaticEntry={handleSomaticEntry}
            onCantTell={() => { setStartedAt(new Date()); setStep('find'); }}
          />
        )}

        {step === 'help_now' && <HelpNowInterim onDone={() => setStep('emotion')} />}

        {step === 'find' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setStep('emotion')}
              className="min-h-11 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <span aria-hidden="true">← </span>Back to feelings
            </button>
            <FindTheFeeling entry="checkin" onHandoff={handleFound} />
          </div>
        )}

        {step === 'capacity' && (
          <BandGate context="checkin" force onBand={(r) => handleBand(r)} />
        )}

        {step === 'body' && (
          <BodyMap
            onTap={handleBodyTap}
            onSkip={handleSkipBody}
            onComplete={handleBodyComplete}
            sensations={checkInData.bodySensations}
            isSomaticEntry={entryPoint === 'somatic'}
          />
        )}

        {step === 'suggestion' && (
          <EmotionSuggestion
            bodySensations={checkInData.bodySensations}
            onSelect={handleSuggestionSelect}
            onShowAllEmotions={handleShowAllEmotions}
            onSkip={handleSuggestionSkip}
          />
        )}

        {step === 'discriminating' && discriminatingQuestions.length > 0 && (
          <DiscriminatingQuestions
            questions={discriminatingQuestions}
            onComplete={handleDiscriminatingComplete}
            onSkip={handleDiscriminatingSkip}
          />
        )}

        {step === 'sensation' && currentSensation && (
          <SensationDetails
            x={currentSensation.x!}
            y={currentSensation.y!}
            region={currentSensation.region!}
            onComplete={handleSensationComplete}
            onCancel={() => {
              setCurrentSensation(null);
              setStep('body');
            }}
          />
        )}

        {step === 'analyzing' && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4"></div>
            <p className="text-[var(--color-text-secondary)]">Understanding what's happening...</p>
          </div>
        )}

        {step === 'result' && stateResult && (
          stateResult.guidedActivity && checkInData.quadrant === 'low-unpleasant' ? (
            <LowEnergyStateResult
              result={stateResult}
              checkInId={checkInId}
              onToolOpen={handleToolOpen}
              onDone={handleResultDone}
              onAddMoreDetail={
                (!checkInData.emotions.length || !checkInData.bodySensations.length)
                  ? handleAddMoreDetail
                  : undefined
              }
              checkinEmotions={checkInData.emotions}
              band={capacity?.value ?? null}
            />
          ) : (
            <StateResult
              result={stateResult}
              checkInId={checkInId}
              onToolOpen={handleToolOpen}
              onDone={handleResultDone}
              onAddMoreDetail={
                (!checkInData.emotions.length || !checkInData.bodySensations.length)
                  ? handleAddMoreDetail
                  : undefined
              }
              checkinEmotions={checkInData.emotions}
              band={capacity?.value ?? null}
            />
          )
        )}

        {step === 'saving' && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin mb-4"></div>
            <p className="text-[var(--color-text-secondary)]">Saving your check-in...</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center py-8">
            <span className="text-5xl mb-4 block">✨</span>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Check-in saved
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Your check-in has been recorded.
            </p>

            {saveError && (
              <div className="p-3 rounded-lg bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)] text-[var(--color-q-hp-text)] text-sm mb-6">
                {saveError}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleComplete}
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
              >
                Done
              </button>

              <Link
                to="/history"
                className="block w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary"
              >
                View history →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
