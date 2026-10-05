import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { CheckInSquare } from '../components/checkin/CheckInSquare';
import { WordPick } from '../components/checkin/WordPick';
import { BodyStep, type BodyMark } from '../components/checkin/body/BodyStep';
import { StateResult } from '../components/checkin/StateResult';
import { LowEnergyStateResult } from '../components/checkin/LowEnergyStateResult';
import { EmotionSuggestion } from '../components/checkin/EmotionSuggestion';
import { DiscriminatingQuestions } from '../components/checkin/DiscriminatingQuestions';
import {
  saveCheckIn,
  setCheckInNextAction,
  getStateAndTools,
  getDiscriminatingQuestions,
  preloadCheckInContent,
  warmCheckInEngine,
  type StateResult as StateResultType,
  type DiscriminatingQuestion,
} from '../services/neo4j';
import { getEmotionById, getEmotionByName } from '../data/emotions';
import { allWords, emptySpot, leadSpot, quadrantAt, squareColor, type SquarePoint, type Spot } from '../lib/feelingSquare';
import { FindTheFeeling, type FindTheFeelingResult } from './tools/FindTheFeeling';
import { useHideToday } from '../hooks/useToday';
import { HelpNowInterim } from '../components/checkin/HelpNowInterim';
import { newId } from '../lib/spine/ids';
import {
  buildCheckInPayload,
  emotionIdsFor,
  ftfReading,
  type CheckInNextAction,
  type CheckInSource,
} from '../lib/spine/checkInPayload';
import type { CapacityReading } from '../data/capacityTypes';
import { recordToolSession } from '../services/spine';
import { useBand } from '../hooks/useBand';
import { bandStepFor, checkInIntensity } from '../lib/checkInBand';
import { beatBand, beatRequest, type WitnessHandlers } from '../lib/witness';
import { recordWitnessBeat } from '../services/witness';
import { profileCache } from '../lib/profileCache';

type EntryPoint = 'standard' | 'somatic';

/** Quadrants whose check-ins get the discriminating questions (E4-6: both unpleasant quadrants). */
function asksDiscriminatingQuestions(quadrant: string | null): quadrant is 'high-unpleasant' | 'low-unpleasant' {
  return quadrant === 'high-unpleasant' || quadrant === 'low-unpleasant';
}

/** The routing band's source (E4-3 accepts probe · ftf · carried; hand-offs etc. count as carried). */
function routingBandSource(r: CapacityReading): 'probe' | 'ftf' | 'carried' {
  return r.source === 'probe' || r.source === 'ftf' ? r.source : 'carried';
}

type CheckInStep =
  | 'emotion'
  | 'word'
  | 'help_now'
  | 'find'
  | 'discriminating'
  | 'body'
  | 'suggestion'
  | 'analyzing'
  | 'result'
  | 'saving'
  | 'complete';

type BodySensation = BodyMark;

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
  // Places on the feeling square (one per part of a mixed feeling, up to MAX_SPOTS) and the words
  // picked for each.
  const [spots, setSpots] = useState<Spot[]>([emptySpot()]);
  const [active, setActive] = useState(0);
  // Where "Never mind" on a newly added spot returns to.
  const [spotReturn, setSpotReturn] = useState<'emotion' | 'word'>('emotion');
  // Where Help now goes back to (the square or the words).
  const [helpReturn, setHelpReturn] = useState<'emotion' | 'word'>('emotion');
  const point = spots[active]?.point ?? null;
  // Today (follow-ups, "did it help?", OA plans) lives in the side panel / the header's Today button,
  // not above the square. Here it shows only on the untouched square: from the first touch on (and in
  // Help me now) it hides, so it is never beside a check-in, a result or the crisis banner (D-09).
  useHideToday(!(step === 'emotion' && active === 0 && !point));
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
  // The check-in no longer asks the band question (Claudia, 30 Sep: the favour probe is out until
  // there is a better way to ask it). An unpleasant check-in carries a current reading (≤ 20 min,
  // not flooded); otherwise it has no band and the engine infers one. Pleasant: no band (D-07).
  const band = useBand();
  const capacityRef = useRef<CapacityReading | null>(null);
  const setCapacity = (r: CapacityReading | null) => { capacityRef.current = r; setCapacityState(r); };
  useEffect(() => { if (user) band.load(); }, [user, band]);
  const [knownEmotionIds, setKnownEmotionIds] = useState<string[]>([]);
  /** Find the feeling's pull was `blank` (E4-4): the engine never offers a calming tool then. */
  const ftfBlank = useRef(false);
  // "Continue" is working: the button shows it, and taps while it works are ignored (a ref, so two
  // taps in the same frame can't both get through).
  const continuingRef = useRef(false);
  const [continuing, setContinuing] = useState(false);
  // The check-in's files (related words, follow-up questions) start loading as the screen opens.
  useEffect(() => { preloadCheckInContent(); }, []);
  // Wake the result's engine while the person is still on the square (signed-in only).
  useEffect(() => { if (user) warmCheckInEngine(); }, [user]);
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
    // A re-save ("add more detail") waits for the one in flight, so an earlier snapshot can never
    // land after a newer one (Codex, PR #16). The payload is taken now, not when it runs.
    const payload = buildCheckInPayload(payloadState(), stateResult);
    const prev = savePromise.current ?? Promise.resolve(true);
    savePromise.current = prev
      .then(() => saveCheckIn(payload))
      .then(() => true)
      .catch((err) => {
        console.error('Failed to save check-in:', err);
        return false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, step, stateResult]);

  // === Witness beat (A5-3) ===
  // The beat's log is queued behind the render save (R4: it keys on the check-in id) and ahead of
  // the next action, which finalises the check-in (R2: a final check-in takes no new SHOWED_LINE).
  const beatQueue = useRef<Promise<void>>(Promise.resolve());
  function logBeat(...[result, lines]: Parameters<WitnessHandlers['onDone']>) {
    if (!user || !checkInData.quadrant) return;
    const req = beatRequest({
      checkInId, moment: 'checkin_result', band: beatBand(capacity?.value), lines, result,
      emotionIds: emotionIdsFor(checkInData.emotions, knownEmotionIds),
    });
    const saved = savePromise.current ?? Promise.resolve(false);
    beatQueue.current = beatQueue.current
      .then(() => saved)
      .then((ok) => (ok ? recordWitnessBeat(req) : null))
      .then((r) => { if (r?.profileVersion != null) profileCache.bump(r.profileVersion); })
      .catch((err) => { console.error('Failed to record the witness beat:', err); });
  }
  const witness: WitnessHandlers = { onShown: logBeat, onDone: logBeat };

  /**
   * Record the next action once the render save settled (and any queued beat log). If that save
   * failed, save again with the next action inline (same id, so nothing duplicates). Resolves true
   * when recorded.
   */
  function recordNextAction(next: CheckInNextAction): Promise<boolean> {
    const id = checkInId;
    const state = payloadState();
    const result = stateResult;
    const beats = beatQueue.current;
    const pending = (savePromise.current ?? Promise.resolve(false)).then((saved) => beats.then(() => saved));
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
        ...(cap ? { band: cap.value, bandViaCantTell: cap.viaCantTell, bandSource: routingBandSource(cap) } : {}),
        ...(ftfBlank.current ? { blank: true } : {}),
        surface: 'checkin',
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
    setHelpReturn(step === 'word' ? 'word' : 'emotion');
    setStep('help_now');
  }

  // ── The square and its spots ──
  function updateActive(change: (s: Spot) => Spot) {
    setSpots(prev => prev.map((s, i) => (i === active ? change(s) : s)));
  }

  function handleMovePoint(p: SquarePoint) {
    updateActive(s => ({ ...s, point: p }));
  }

  function handleToggleWord(name: string) {
    updateActive(s => ({ ...s, words: s.words.includes(name) ? s.words.filter(w => w !== name) : [...s.words, name] }));
  }

  /** Take a word off another spot; a spot left with no words goes too. */
  function handleRemoveWord(index: number, name: string) {
    const next = spots.map((s, i) => (i === index ? { ...s, words: s.words.filter(w => w !== name) } : s));
    if (next[index].words.length === 0 && index !== active) {
      setSpots(next.filter((_, i) => i !== index));
      if (index < active) setActive(active - 1);
    } else {
      setSpots(next);
    }
  }

  /** Keep this spot and place another (up to MAX_SPOTS). */
  function handleAddSpot() {
    setSpotReturn(step === 'word' ? 'word' : 'emotion');
    setSpots(prev => [...prev, emptySpot()]);
    setActive(spots.length);
    setStep('emotion');
  }

  /** Leave a just-added spot. With no words it is dropped; with words it is kept. */
  function handleCancelSpot() {
    if (spots[active].words.length === 0) {
      setSpots(prev => prev.filter((_, i) => i !== active));
    }
    setActive(Math.max(0, active - 1));
    setStep(spotReturn);
  }

  /**
   * Done with the square: every picked word goes forward. The routing quadrant comes from the words
   * (inferQuadrant), and intensity from the spot those words sit in. Spots without words are dropped.
   * No words ("Continue without a word"): the quadrant and intensity come from the point.
   */
  function handleWordsContinue() {
    if (continuingRef.current) return;
    continuingRef.current = true;
    setContinuing(true);
    const done = () => { continuingRef.current = false; setContinuing(false); };
    if (user) warmCheckInEngine(); // again, in case the square sat open long enough for it to sleep
    setStartedAt(new Date());
    setSource('grid');
    setKnownEmotionIds([]);
    ftfBlank.current = false;
    const filled = spots.filter(s => s.point && s.words.length > 0);
    const all = allWords(filled);
    if (all.length === 0) {
      const p = point ?? { x: 0.5, y: 0.5 };
      setCheckInData(prev => ({ ...prev, intensity: { x: p.x, y: p.y } }));
      void handleEmotionSelect([], quadrantAt(p)).finally(done);
      return;
    }
    const lead = leadSpot(filled, inferQuadrant(all))?.point ?? point ?? { x: 0.5, y: 0.5 };
    setSpots(filled);
    setActive(Math.min(active, filled.length - 1));
    setCheckInData(prev => ({ ...prev, intensity: { x: lead.x, y: lead.y } }));
    void handleEmotionSelect(all).finally(done);
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
   * Back from Find the feeling (check-in mode). A found word becomes the check-in emotion and FTF's
   * band (when it has one) sets intensity; no word falls back to the body-first path. FTF no longer
   * asks the capacity question, so today the band is null: no capacity, unbanded intensity (0.5).
   */
  function handleFound(r: FindTheFeelingResult) {
    // FTF's band is this check-in's capacity answer (kept, not just turned into intensity).
    setSource('ftf');
    ftfBlank.current = r.blank === true;
    // FTF recorded its answer in the band store (context 'checkin'); use that reading so its id
    // matches, else build the same reading here.
    const current = band.current();
    const fromFtf = r.band && current && current.source === 'ftf' && current.context === 'checkin' && current.value === r.band ? current : null;
    setCapacity(r.band ? fromFtf ?? ftfReading(newId(), r.band) : null);
    const y = r.intensityY ?? 0.5;
    if (r.toolSessionId) setEmbeddedIds([r.toolSessionId]);
    const emotion = r.emotionId ? getEmotionById(r.emotionId) : undefined;
    if (emotion) setKnownEmotionIds([emotion.id]);
    if (!emotion) {
      setCheckInData(prev => ({ ...prev, intensity: { x: 0.5, y } }));
      setEntryPoint('somatic');
      setStep('body');
      return;
    }
    const intensity = { x: emotion.x ?? 0.5, y };
    setSpots([{ point: intensity, words: [emotion.name] }]);
    setActive(0);
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
   * check-in's band or carry a current one; nothing is asked. Then the body map (standard) or the
   * analysis (somatic, which has already been through the body map).
   */
  function afterFeelings(quadrant: string | null, then: 'body' | 'analyze', overrides?: { quadrant?: string; emotions?: string[] }) {
    const d = bandStepFor(quadrant, capacityRef.current, band.current());
    const cap = d.carry ? band.carry('checkin') : d.keep;
    setCapacity(cap);
    if (then === 'body') setStep('body');
    else void analyzeAndShowResult({ ...overrides, capacity: cap });
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

  async function handleEmotionSelect(emotions: string[], fallbackQuadrant?: string) {
    const inferredQuadrant = emotions.length > 0 || !fallbackQuadrant ? inferQuadrant(emotions) : fallbackQuadrant;
    setCheckInData(prev => ({ ...prev, emotions, quadrant: inferredQuadrant }));

    // Unpleasant check-ins: fetch the quadrant's discriminating questions (E4-6: high-unpleasant
    // too; the graph has them, they were never asked). Skippable; skipping keeps today's scoring.
    if (asksDiscriminatingQuestions(inferredQuadrant)) {
      try {
        const questions = await getDiscriminatingQuestions(inferredQuadrant);
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

  /** The body step's marks (one per place; both sides unless the user picked one). */
  function handleBodyChange(bodySensations: BodySensation[]) {
    setCheckInData(prev => ({ ...prev, bodySensations }));
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
    setKnownEmotionIds([]);
    setEmbeddedIds([]);
    ftfBlank.current = false;
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
    setSpots([emptySpot()]);
    setActive(0);
    setStep('emotion');
  }

  function handleBack() {
    const wordsOrSquare = point ? 'word' : 'emotion';
    switch (step) {
      case 'help_now':
        setStep(helpReturn);
        break;
      case 'word':
        setStep('emotion');
        break;
      case 'discriminating':
        setStep(wordsOrSquare);
        break;
      case 'body':
        if (entryPoint === 'somatic') {
          setEntryPoint('standard');
          setStep('emotion');
        } else if (discriminatingQuestions.length > 0 && asksDiscriminatingQuestions(checkInData.quadrant)) {
          setStep('discriminating');
        } else {
          setStep(wordsOrSquare);
        }
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
    ? ['body', 'suggestion']
    : [
      'emotion',
      'word',
      ...(discriminatingQuestions.length > 0 ? ['discriminating'] : []),
      'body',
    ];
  const currentStepIndex = stepOrder.indexOf(step);
  // The square is the whole first screen; progress only shows once there is something behind you.
  const showProgress = step !== 'emotion' && step !== 'word' && currentStepIndex >= 0 && currentStepIndex < stepOrder.length;
  // The room takes the colour of where the square was touched, for the rest of the check-in.
  const tintPoint = point ?? spots.find(s => s.point)?.point ?? null;
  const tintOn = tintPoint !== null && step !== 'complete' && step !== 'saving' && step !== 'help_now';

  return (
    <div>
      <div
        aria-hidden="true"
        className={`feeling-tint${tintOn ? ' is-on' : ''}`}
        style={tintPoint ? ({ ['--tint' as string]: squareColor(tintPoint) }) : undefined}
      />

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
              : (currentStepIndex === 0 ? 'Start here' : 'Optional. Skip anytime.')
            }
          </p>
        </div>
      )}

      {/* Back button for steps after first */}
      {step !== 'emotion' && step !== 'find' && step !== 'analyzing' && step !== 'saving' && step !== 'complete' && (
        <button
          onClick={handleBack}
          className={`${step === 'word' ? 'max-w-md mx-auto w-full ' : ''}flex items-center gap-1 min-h-11 -ml-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-3 transition-colors bg-transparent border-none cursor-pointer`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          <span className="text-[15px] font-semibold">Back</span>
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
          <CheckInSquare
            spots={spots}
            active={active}
            onMove={handleMovePoint}
            onToggleWord={handleToggleWord}
            onSeeMore={() => setStep('word')}
            onContinue={handleWordsContinue}
            continuing={continuing}
            onAddSpot={handleAddSpot}
            onCancelSpot={handleCancelSpot}
            onHelpNow={handleHelpMeNow}
            onCantTell={() => { setStartedAt(new Date()); setStep('find'); }}
            onStartWithBody={handleSomaticEntry}
          />
        )}

        {step === 'word' && point && (
          <WordPick
            spots={spots}
            active={active}
            onToggleWord={handleToggleWord}
            onRemoveWord={handleRemoveWord}
            onContinue={handleWordsContinue}
            continuing={continuing}
            onMovePoint={() => setStep('emotion')}
            onAddSpot={handleAddSpot}
            onNoneFit={() => { setStartedAt(new Date()); setStep('find'); }}
            onHelpNow={handleHelpMeNow}
          />
        )}

        {step === 'help_now' && <HelpNowInterim onDone={() => setStep(helpReturn)} />}

        {step === 'find' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setStep(point ? 'word' : 'emotion')}
              className="flex items-center gap-1 min-h-11 -ml-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] bg-transparent border-none cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
              <span className="text-[15px] font-semibold">{point ? 'Back to the words' : 'Back to the square'}</span>
            </button>
            <FindTheFeeling entry="checkin" onHandoff={handleFound} />
          </div>
        )}

        {step === 'body' && (
          <BodyStep
            marks={checkInData.bodySensations}
            onChange={handleBodyChange}
            onSkip={handleSkipBody}
            onComplete={handleBodyComplete}
            isSomaticEntry={entryPoint === 'somatic'}
            emotionIds={entryPoint === 'somatic' ? [] : emotionIdsFor(checkInData.emotions, knownEmotionIds)}
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
              emotionIds={emotionIdsFor(checkInData.emotions, knownEmotionIds)}
              witness={witness}
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
              emotionIds={emotionIdsFor(checkInData.emotions, knownEmotionIds)}
              witness={witness}
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
                className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
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
