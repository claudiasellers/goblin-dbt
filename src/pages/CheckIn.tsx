import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { EmotionQuadrant } from '../components/checkin/EmotionQuadrant';
import { EmotionGrid } from '../components/checkin/EmotionGrid';
import { IntensityGrid } from '../components/checkin/IntensityGrid';
import { BodyMap } from '../components/checkin/BodyMap';
import { SensationDetails } from '../components/checkin/SensationDetails';
import { StateResult } from '../components/checkin/StateResult';
import { 
  saveCheckIn, 
  ensureUserExists, 
  getStateAndTools,
  type StateResult as StateResultType 
} from '../services/neo4j';

type CheckInStep = 
  | 'quadrant' 
  | 'emotion' 
  | 'intensity' 
  | 'body' 
  | 'sensation' 
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
  const [step, setStep] = useState<CheckInStep>('quadrant');
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

  // If not logged in, show prompt
  if (!user) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block sparkle">💫</span>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
          Check in with yourself
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Create an account to start tracking your emotions and body sensations.
        </p>
        <div className="space-y-3">
          <Link
            to="/signup"
            className="block w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(155,89,182,0.4)]"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="block w-full py-3.5 px-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-[var(--color-sage-300)] text-[var(--color-text-primary)] font-semibold hover:bg-white/90 hover:border-[#d4af37] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  /**
   * Analyze the current state and get recommendations
   * Can be called at any step - progressive disclosure means any data is enough
   */
  async function analyzeAndShowResult() {
    if (!checkInData.quadrant) return;
    
    setStep('analyzing');
    setAnalyzeError(null);

    try {
      const result = await getStateAndTools({
        quadrant: checkInData.quadrant,
        emotions: checkInData.emotions.length > 0 ? checkInData.emotions : undefined,
        intensity: checkInData.intensity || undefined,
        bodySensations: checkInData.bodySensations.length > 0 
          ? checkInData.bodySensations.map(s => ({ region: s.region, tags: s.tags }))
          : undefined,
      });
      
      setStateResult(result);
      setStep('result');
    } catch (error) {
      console.error('Failed to analyze state:', error);
      setAnalyzeError('Unable to analyze right now. Please try again.');
      // Fall back to previous step
      if (checkInData.bodySensations.length > 0) {
        setStep('body');
      } else if (checkInData.intensity) {
        setStep('intensity');
      } else if (checkInData.emotions.length > 0) {
        setStep('emotion');
      } else {
        setStep('quadrant');
      }
    }
  }

  function handleQuadrantSelect(quadrant: string) {
    setCheckInData(prev => ({ ...prev, quadrant }));
    setStep('emotion');
  }

  /**
   * "Help me now" - skip to analysis with just quadrant
   */
  function handleHelpMeNow() {
    analyzeAndShowResult();
  }

  function handleEmotionSelect(emotions: string[]) {
    setCheckInData(prev => ({ ...prev, emotions }));
    setStep('intensity');
  }

  function handleIntensitySelect(intensity: { x: number; y: number }) {
    setCheckInData(prev => ({ ...prev, intensity }));
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
    // Instead of saving, go to analysis
    await analyzeAndShowResult();
  }

  async function handleBodyComplete() {
    // Instead of saving, go to analysis
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
    } else if (!checkInData.intensity) {
      setStep('intensity');
    } else {
      setStep('body');
    }
  }

  function handleComplete() {
    // Reset for new check-in
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
    setStep('quadrant');
  }

  function handleBack() {
    switch (step) {
      case 'emotion':
        setStep('quadrant');
        break;
      case 'intensity':
        setStep('emotion');
        break;
      case 'body':
        setStep('intensity');
        break;
      case 'sensation':
        setCurrentSensation(null);
        setStep('body');
        break;
      case 'result':
        // Allow going back to add more detail
        handleAddMoreDetail();
        break;
      case 'complete':
        setStep('result');
        break;
    }
  }

  // Calculate progress for the stepper
  const stepOrder = ['quadrant', 'emotion', 'intensity', 'body'];
  const currentStepIndex = stepOrder.indexOf(step);
  const showProgress = currentStepIndex >= 0 && currentStepIndex < stepOrder.length;

  return (
    <div>
      {/* Progress indicator - floating pearl/stars */}
      {showProgress && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3">
            {stepOrder.map((s, i) => (
              <div
                key={s}
                className={`
                  w-4 h-4 rounded-full transition-all duration-500
                  ${i < currentStepIndex 
                    ? 'bg-gradient-to-br from-[#f9e076] to-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.6)]' 
                    : i === currentStepIndex 
                      ? 'bg-gradient-to-br from-[#f9e076] to-[#d4af37] shadow-[0_0_16px_rgba(212,175,55,0.8)] scale-125 pearl-active' 
                      : 'bg-white/60 border-2 border-[var(--color-sage-300)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]'
                  }
                `}
              />
            ))}
          </div>
          <p className="text-xs text-center text-[var(--color-text-secondary)] mt-4 leading-relaxed">
            {currentStepIndex === 0 
              ? '✨ Required' 
              : '✨ Optional — tap "Help me now" anytime'}
          </p>
        </div>
      )}

      {/* Back button for steps after first */}
      {step !== 'quadrant' && step !== 'analyzing' && step !== 'saving' && step !== 'complete' && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-[var(--color-sage-500)] hover:text-[var(--color-sage-700)] mb-4 transition-colors group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          <span className="text-sm font-medium">Back</span>
        </button>
      )}

      {/* Error display - soft rose styling */}
      {analyzeError && (
        <div className="mb-4 p-4 rounded-2xl bg-[#FEE2E2]/60 backdrop-blur-sm border border-[#FECACA] text-[#991B1B] text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          {analyzeError}
        </div>
      )}

      {step === 'quadrant' && (
        <EmotionQuadrant onSelect={handleQuadrantSelect} />
      )}

      {step === 'emotion' && checkInData.quadrant && (
        <EmotionGrid 
          quadrant={checkInData.quadrant} 
          onSelect={handleEmotionSelect}
          showRelated={true}
          onHelpMeNow={handleHelpMeNow}
        />
      )}

      {step === 'intensity' && (
        <div>
          <IntensityGrid onSelect={handleIntensitySelect} />
          
          {/* Help me now button - glassmorphic with gold shimmer */}
          <div className="mt-6 pt-6 border-t border-[var(--color-sage-200)]/50">
            <button
              onClick={handleHelpMeNow}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold transition-all 
                bg-white/70 backdrop-blur-sm
                border-2 border-[#d4af37]
                text-[var(--color-text-primary)]
                shadow-[0_0_20px_rgba(212,175,55,0.3),inset_0_1px_0_rgba(255,255,255,0.8)]
                hover:shadow-[0_0_28px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.9)]
                hover:bg-white/80
                flex items-center justify-center gap-2"
            >
              <span>💫</span> Help me now
            </button>
          </div>
        </div>
      )}

      {step === 'body' && (
        <BodyMap 
          onTap={handleBodyTap}
          onSkip={handleSkipBody}
          onComplete={handleBodyComplete}
          sensations={checkInData.bodySensations}
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
          <div className="inline-block w-10 h-10 border-4 border-[var(--color-sage-200)] border-t-[#d4af37] rounded-full animate-spin mb-4 shadow-[0_0_12px_rgba(212,175,55,0.4)]"></div>
          <p className="text-[var(--color-text-secondary)]">✨ Understanding what's happening...</p>
        </div>
      )}

      {step === 'result' && stateResult && (
        <StateResult
          result={stateResult}
          onDone={handleResultDone}
          onAddMoreDetail={
            // Only show "add more detail" if they haven't completed all steps
            (!checkInData.emotions.length || !checkInData.intensity || !checkInData.bodySensations.length)
              ? handleAddMoreDetail
              : undefined
          }
        />
      )}

      {step === 'saving' && (
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-[var(--color-sage-200)] border-t-[#d4af37] rounded-full animate-spin mb-4 shadow-[0_0_12px_rgba(212,175,55,0.4)]"></div>
          <p className="text-[var(--color-text-secondary)]">✨ Saving your check-in...</p>
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center py-8">
          <span className="text-6xl mb-4 block sparkle">🌟</span>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
            Check-in saved
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-6">
            Your check-in has been recorded.
          </p>

          {saveError && (
            <div className="p-4 rounded-2xl bg-[#FEF3C7]/60 backdrop-blur-sm border border-[#FDE68A] text-[#92400E] text-sm mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              {saveError}
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={handleComplete}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(155,89,182,0.4)]"
            >
              Done
            </button>
            
            <Link
              to="/history"
              className="block w-full py-3.5 px-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-[var(--color-sage-300)] text-[var(--color-text-primary)] font-semibold hover:bg-white/90 hover:border-[#d4af37] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            >
              View history →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
