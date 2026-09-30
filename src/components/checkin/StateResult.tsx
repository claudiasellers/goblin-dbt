import { useState, useEffect, useCallback } from 'react';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import type { StateResult } from '../../services/neo4j';
import { CrisisBanner } from '../safety/CrisisBanner';
import { bailoutSections, resultSections, type ResultSection } from '../../lib/crisisBanner';
import { recommendationCards } from '../../lib/recommendation';
import { RecommendationCards } from './RecommendationCards';
import type { CheckInNextAction } from '../../lib/spine/checkInPayload';
import type { Band } from '../../data/capacityTypes';
import { WitnessBeat } from '../witness/WitnessBeat';
import { beatBand, beatVariant, showsWitnessBeat, type WitnessHandlers } from '../../lib/witness';

interface StateResultProps {
  result: StateResult;
  /** Called with what the user did (Done, a micro-step, a guided activity); Done when omitted. */
  onDone: (next?: CheckInNextAction) => void;
  /** The saved check-in (PR-C1): tool links carry it so the tool session links back to it. */
  checkInId?: string;
  /** A tool card tap (recorded as the check-in's next action; navigation doesn't wait). */
  onToolOpen?: (toolId: string) => void;
  onAddMoreDetail?: () => void;
  checkinEmotions?: string[];
  /** The check-in's band (A4-3): read by the witness beat (A5-3); routing reads it from E4-3. */
  band?: Band | null;
  /** Graph ids of the check-in's words (the beat's family / word match). */
  emotionIds?: string[];
  /** The witness beat's log (A5-3): the host queues recordWitnessBeat until the check-in is saved. */
  witness?: WitnessHandlers;
}

/**
 * "What's happening right now" — the single-screen neural state summary
 * 
 * Shows one cohesive state description (the userFacingLabel from the activation pattern),
 * followed by 1-2 recommended tools. No browsing, no menu of 40 tools.
 * 
 * The user came in feeling a vague soup of bad. We give them language for it
 * (affect labeling), and immediately follow with "here's what to do."
 * 
 * === BAILOUT FLOW ===
 * If even the recommended tools feel too overwhelming, a "That feels like too much
 * right now" button at the bottom swaps the entire screen for a single, massive,
 * dead-simple micro-step that is clinically matched to their neural activation pattern.
 * 
 * This ensures the app never becomes another source of guilt/failure — there is
 * always something small enough that anyone can do it.
 *
 * === CRISIS BANNER ===
 * A crisis safety flag adds <CrisisBanner /> at the top of this screen (and of
 * the micro-step screen). Everything else still renders below it. Layout comes
 * from `resultSections` / `bailoutSections` in src/lib/crisisBanner.ts.
 */
export function StateResult({ result, onDone, onAddMoreDetail, checkinEmotions, checkInId, onToolOpen, band, emotionIds, witness }: StateResultProps) {
  const { pattern, safetyFlag } = result;
  // E4-4: one recommendation + one swap, named from src/data/tools.ts; unknown ids never render.
  const cards = recommendationCards(result);
  const sections = resultSections({
    variant: 'standard',
    safetyFlag,
    patternId: pattern.id,
    toolCount: cards.length,
    canAddMoreDetail: !!onAddMoreDetail,
  });
  const has = (section: ResultSection) => sections.includes(section);

  // === Bailout state ===
  const [bailoutStep, setBailoutStep] = useState<MicroStep | null>(null);
  const [bailoutIndex, setBailoutIndex] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedStepId, setCompletedStepId] = useState<string | undefined>(undefined);

  const handleBailoutComplete = useCallback((stepId?: string) => {
    setCompletedStepId(stepId);
    setIsCompleting(true);
  }, []);

  useEffect(() => {
    if (!isCompleting) return;
    const timer = setTimeout(() => {
      onDone({ kind: 'micro_step', microStepId: completedStepId });
    }, 1800);
    return () => clearTimeout(timer);
  }, [isCompleting, onDone, completedStepId]);

  function handleBailout() {
    const { step, index } = getMicroStep(pattern.id);
    setBailoutStep(step);
    setBailoutIndex(index);
  }

  function handleShowAnother() {
    if (bailoutIndex === null) return;
    const { step, index } = getMicroStep(pattern.id, bailoutIndex);
    setBailoutStep(step);
    setBailoutIndex(index);
  }

  // ===========================================
  // RENDER: Completion confirmation
  // Brief, warm, non-patronizing acknowledgment
  // ===========================================
  if (isCompleting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center animate-fade-in">
          <p className="text-xl text-[var(--color-text-secondary)] font-medium leading-relaxed">
            That counts.
          </p>
          <p className="text-xl text-[var(--color-text-secondary)] font-medium leading-relaxed">
            You did something.
          </p>
        </div>
      </div>
    );
  }

  // ===========================================
  // RENDER: Bailout micro-step (full-screen takeover)
  // Maximum simplicity. One instruction. One action.
  // ===========================================
  if (bailoutStep) {
    return (
      <div>
        {bailoutSections(safetyFlag).includes('crisis_banner') && <CrisisBanner />}
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          {/* Compassionate header — small, gentle, not attention-competing */}
          <p className="text-sm text-[var(--color-text-tertiary)] mb-8">
            That's okay. Let's go smaller.
          </p>

          {/* THE INSTRUCTION — the only thing that matters on this screen */}
          <div className="text-center mb-12 max-w-sm">
            <p className="text-2xl sm:text-3xl font-semibold text-[var(--color-text-primary)] leading-snug mb-4">
              {bailoutStep.text}
            </p>
            {bailoutStep.subtext && (
              <p className="text-base text-[var(--color-text-tertiary)] leading-relaxed">
                {bailoutStep.subtext}
              </p>
            )}
          </div>

          {/* Single primary action */}
          <button
            onClick={() => handleBailoutComplete(bailoutStep.id)}
            className="w-full max-w-xs py-4 px-6 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium text-lg lift-primary"
          >
            I did it
          </button>

          {/* Subtle cycle option — for accessibility (e.g., step requires cold water but user is in bed) */}
          <button
            onClick={handleShowAnother}
            className="mt-4 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Show me something else
          </button>
        </div>
      </div>
    );
  }

  // ===========================================
  // RENDER: Positive state — NO bailout button here
  // ===========================================
  if (pattern.id === 'positive_state') {
    return (
      <div className="text-center py-6">
        {has('crisis_banner') && <CrisisBanner />}
        <span className="text-5xl mb-4 block">✨</span>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
          {pattern.userFacingLabel}
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-8">
          No action needed right now. Enjoy this moment.
        </p>
        <button
          onClick={() => onDone({ kind: 'done' })}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
        >
          Done
        </button>
      </div>
    );
  }

  // ===========================================
  // RENDER: Standard intervention view
  // [crisis banner] -> state label -> tools -> actions -> bailout escape hatch
  // ===========================================
  return (
    <div className="py-4">
      {/* Crisis resources: a banner above the result, never instead of it */}
      {has('crisis_banner') && <CrisisBanner />}

      {/* The State Summary - one cohesive sentence */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] mb-4">
          <span className="text-2xl">{getPatternEmoji(pattern.id)}</span>
        </div>
        
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3 leading-relaxed">
          {pattern.userFacingLabel}
        </h2>
        
        {pattern.confidence < 0.6 && (
          <p className="text-sm text-[var(--color-text-tertiary)] mb-2">
            Based on what you've shared
          </p>
        )}
      </div>

      {/* The witness beat (A5-3, R21): below the banner, above the tools; it never gates them */}
      {showsWitnessBeat(pattern.id) && (
        <WitnessBeat hostToolId="checkin" moment="checkin_result" band={beatBand(band)} variant={beatVariant(beatBand(band))}
          words={checkinEmotions ?? []} emotionIds={emotionIds}
          onShown={witness?.onShown} onDone={(r, lines) => witness?.onDone(r, lines)} />
      )}

      {/* Clinical referral warning if needed */}
      {has('clinical_note') && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)]">
          <p className="text-[var(--color-q-hp-text)] text-sm">
            <strong>Note:</strong> If this feeling persists, consider reaching out to a mental health professional.
          </p>
        </div>
      )}

      {/* The tools: one recommendation and one swap (E4-4), below the banner and the beat */}
      {has('tools') && (
        <div className="mb-8">
          <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
            Here's what might help right now
          </p>
          <RecommendationCards cards={cards} checkinEmotions={checkinEmotions} activationPatternId={pattern.id}
            checkInId={checkInId} onOpen={(toolId) => onToolOpen?.(toolId)} />
        </div>
      )}

      {/* Primary actions */}
      <div className="space-y-3">
        <button
          onClick={() => onDone({ kind: 'done' })}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
        >
          Done
        </button>
        
        {has('add_detail') && onAddMoreDetail && (
          <button
            onClick={onAddMoreDetail}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-sm"
          >
            Add more detail to refine this
          </button>
        )}
      </div>

      {/* === THE BAILOUT BUTTON === 
          Lowest-emphasis element on screen. Below Done, below Add More Detail.
          This is an escape hatch, not a primary action.
          
          Wording: "too much" not "too hard" — 
          "hard" implies failure, "too much" normalizes that their 
          nervous system is overwhelmed, which is the actual truth. */}
      {has('bailout') && (
        <div className="mt-6 text-center">
          <button
            onClick={handleBailout}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            That feels like too much right now
          </button>
        </div>
      )}
    </div>
  );
}

function getPatternEmoji(patternId: string): string {
  const map: Record<string, string> = {
    acute_alarm: '\u26A1',
    chronic_vigilance: '\uD83D\uDD0D',
    emotional_flooding: '\uD83C\uDF0A',
    conservation_freeze: '\uD83E\uDDCA',
    dissociation_overmodulation: '\uD83C\uDF2B\uFE0F',
    rumination_loop: '\uD83D\uDD04',
    reward_drive_low: '\uD83E\uDEAB',
    social_threat_shame: '\uD83E\uDEE3',
    grief_yearning: '\uD83D\uDC94',
    reactive_aggression: '\uD83D\uDD25',
    positive_state: '\u2728',
  };
  return map[patternId] || '\uD83E\uDDE0';
}
