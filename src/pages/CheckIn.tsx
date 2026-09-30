import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { CheckInSquare } from '../components/checkin/CheckInSquare';
import { WordPick } from '../components/checkin/WordPick';
import { BodyMap } from '../components/checkin/BodyMap';
import { SensationDetails } from '../components/checkin/SensationDetails';
import { StateResult } from '../components/checkin/StateResult';
import { LowEnergyStateResult } from '../components/checkin/LowEnergyStateResult';
import { EmotionSuggestion } from '../components/checkin/EmotionSuggestion';
import { DiscriminatingQuestions } from '../components/checkin/DiscriminatingQuestions';
import {
  saveCheckIn,
  ensureUserExists,
  getStateAndTools,
  getDiscriminatingQuestions,
  type StateResult as StateResultType,
  type DiscriminatingQuestion,
} from '../services/neo4j';
import { getEmotionById, getEmotionByName } from '../data/emotions';
import { quadrantAt, squareColor, type SquarePoint } from '../lib/feelingSquare';
import { FindTheFeeling, type FindTheFeelingResult } from './tools/FindTheFeeling';
import { useOppositeActionFollowUpsContext } from '../hooks/useOppositeActionFollowUps';
import { OppositeActionFollowUpCard } from '../components/tools/oppositeAction/OppositeActionFollowUpCard';

type EntryPoint = 'standard' | 'somatic';

type CheckInStep =
  | 'emotion'
  | 'word'
  | 'find'
  | 'discriminating'
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
  // Where the touch landed on the feeling square, and the words picked for it.
  const [point, setPoint] = useState<SquarePoint | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [currentSensation, setCurrentSensation] = useState<Partial<BodySensation> | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stateResult, setStateResult] = useState<StateResultType | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [discriminatingQuestions, setDiscriminatingQuestions] = useState<DiscriminatingQuestion[]>([]);
  const [discriminatingAnswers, setDiscriminatingAnswers] = useState<Array<{ questionId: string; responseId: string }>>([]);
  // Opposite Action plans made for later (app-level, shared with the in-tab reminder).
  const followUps = useOppositeActionFollowUpsContext();

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
  async function analyzeAndShowResult(overrides?: { quadrant?: string; emotions?: string[]; intensity?: { x: number; y: number }; discAnswers?: Array<{ questionId: string; responseId: string }> }) {
    const quadrant = overrides?.quadrant ?? checkInData.quadrant;
    const emotions = overrides?.emotions ?? checkInData.emotions;
    const intensity = overrides?.intensity ?? checkInData.intensity;
    const discAnsw = overrides?.discAnswers ?? discriminatingAnswers;
    if (!quadrant) return;

    setStep('analyzing');
    setAnalyzeError(null);

    try {
      const result = await getStateAndTools({
        quadrant,
        emotions: emotions.length > 0 ? emotions : undefined,
        intensity: intensity || undefined,
        bodySensations: checkInData.bodySensations.length > 0
          ? checkInData.bodySensations.map(s => ({ region: s.region, tags: s.tags }))
          : undefined,
        discriminatingAnswers: discAnsw.length > 0 ? discAnsw : undefined,
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
          await ensureUserExists(user.uid, user.email || '');
          await saveCheckIn(user.uid, {
            emotion: emotions.join(', ') || quadrant,
            quadrant,
            intensity: intensity || { x: 0.5, y: 0.5 },
            bodySensations: checkInData.bodySensations,
            note: checkInData.note,
            timestamp: new Date(),
          });
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
   * "Help now": skip straight to tools. Uses whatever is known so far (picked words, else where the
   * square was touched). With nothing yet, assume the loud end: that is when people reach for it.
   */
  function handleHelpMeNow() {
    const quadrant = words.length > 0
      ? inferQuadrant(words)
      : checkInData.quadrant ?? (point ? quadrantAt(point) : 'high-unpleasant');
    const intensity = point ? { x: point.x, y: point.y } : checkInData.intensity ?? { x: 0.2, y: 0.85 };
    setCheckInData(prev => ({ ...prev, quadrant, emotions: words, intensity }));
    analyzeAndShowResult({ quadrant, emotions: words, intensity });
  }

  /** The touch landed on the square: remember it and move to the words. */
  function handlePlace(p: SquarePoint) {
    setPoint(p);
    setCheckInData(prev => ({ ...prev, intensity: { x: p.x, y: p.y } }));
    setStep('word');
  }

  function handleWordsContinue() {
    void handleEmotionSelect(words, point ? quadrantAt(point) : undefined);
  }

  /**
   * "I don't know how I feel" - start with body sensations instead
   */
  function handleSomaticEntry() {
    setEntryPoint('somatic');
    setStep('body');
  }

  /**
   * Back from Find the feeling (check-in mode). A found word becomes the check-in emotion and the
   * capacity band sets intensity; no word falls back to the body-first path.
   */
  function handleFound(r: FindTheFeelingResult) {
    const emotion = r.emotionId ? getEmotionById(r.emotionId) : undefined;
    if (!emotion) {
      setCheckInData(prev => ({ ...prev, intensity: { x: 0.5, y: r.intensityY } }));
      setEntryPoint('somatic');
      setStep('body');
      return;
    }
    const intensity = { x: emotion.x ?? 0.5, y: r.intensityY };
    setPoint(intensity);
    setWords([emotion.name]);
    setCheckInData(prev => ({ ...prev, intensity }));
    void handleEmotionSelect([emotion.name]);
  }

  /**
   * User selected emotions from the somatic suggestion screen
   */
  function handleSuggestionSelect(emotions: string[], quadrant: string) {
    setCheckInData(prev => ({ ...prev, emotions, quadrant }));
    analyzeAndShowResult({ quadrant, emotions });
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
    analyzeAndShowResult({ quadrant });
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

    setStep('body');
  }

  function handleDiscriminatingComplete(answers: Array<{ questionId: string; responseId: string }>) {
    setDiscriminatingAnswers(answers);
    setStep('body');
  }

  function handleDiscriminatingSkip() {
    setStep('body');
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
   * After seeing the result, optionally save the check-in
   */
  async function handleResultDone() {
    if (!user || !checkInData.quadrant) {
      handleComplete();
      return;
    }

    // Save the check-in in the background
    setStep('saving');
    setSaveError(null);

    try {
      await ensureUserExists(user.uid, user.email || '');
      await saveCheckIn(user.uid, {
        emotion: checkInData.emotions.join(', ') || checkInData.quadrant,
        quadrant: checkInData.quadrant,
        intensity: checkInData.intensity || { x: 0.5, y: 0.5 },
        bodySensations: checkInData.bodySensations,
        note: checkInData.note,
        timestamp: new Date(),
        activationPatternId: stateResult?.pattern?.id,
        confidence: stateResult?.pattern?.confidence,
      });
      setStep('complete');
    } catch (error) {
      console.error('Failed to save check-in:', error);
      setSaveError('Failed to save your check-in. It will be stored locally.');
      setStep('complete');
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
    setPoint(null);
    setWords([]);
    setStep('emotion');
  }

  function handleBack() {
    const wordsOrSquare = point ? 'word' : 'emotion';
    switch (step) {
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
        } else if (discriminatingQuestions.length > 0 && checkInData.quadrant === 'low-unpleasant') {
          setStep('discriminating');
        } else {
          setStep(wordsOrSquare);
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
    ? ['body', 'suggestion']
    : discriminatingQuestions.length > 0
      ? ['emotion', 'word', 'discriminating', 'body']
      : ['emotion', 'word', 'body'];
  const currentStepIndex = stepOrder.indexOf(step);
  // The square is the whole first screen; progress only shows once there is something behind you.
  const showProgress = step !== 'emotion' && step !== 'word' && currentStepIndex >= 0 && currentStepIndex < stepOrder.length;
  // The room takes the colour of where the square was touched, for the rest of the check-in.
  const tintOn = point !== null && step !== 'complete' && step !== 'saving';

  return (
    <div>
      <div
        aria-hidden="true"
        className={`feeling-tint${tintOn ? ' is-on' : ''}`}
        style={point ? ({ ['--tint' as string]: squareColor(point) }) : undefined}
      />

      {/* Follow-up on an Opposite Action plan, only before a new check-in starts */}
      {step === 'emotion' && followUps.pending.length > 0 && followUps.ready && (
        <OppositeActionFollowUpCard pending={followUps.pending} copy={followUps.copy} />
      )}

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
            point={point}
            onMove={setPoint}
            onPlace={handlePlace}
            onHelpNow={handleHelpMeNow}
            onCantTell={() => setStep('find')}
            onStartWithBody={handleSomaticEntry}
          />
        )}

        {step === 'word' && point && (
          <WordPick
            point={point}
            selected={words}
            onChange={setWords}
            onContinue={handleWordsContinue}
            onMovePoint={() => setStep('emotion')}
            onNoneFit={() => setStep('find')}
            onHelpNow={handleHelpMeNow}
          />
        )}

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
              onDone={handleResultDone}
              onAddMoreDetail={
                (!checkInData.emotions.length || !checkInData.bodySensations.length)
                  ? handleAddMoreDetail
                  : undefined
              }
              checkinEmotions={checkInData.emotions}
            />
          ) : (
            <StateResult
              result={stateResult}
              onDone={handleResultDone}
              onAddMoreDetail={
                (!checkInData.emotions.length || !checkInData.bodySensations.length)
                  ? handleAddMoreDetail
                  : undefined
              }
              checkinEmotions={checkInData.emotions}
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
