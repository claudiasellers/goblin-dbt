import { useState, useEffect, useCallback } from 'react';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import { getActivityDefinition, PATTERN_CONTEXT } from '../../data/guidedActivities';
import { GuidedActivity } from '../activities/GuidedActivity';
import type { StateResult } from '../../services/neo4j';
import { CrisisBanner } from '../safety/CrisisBanner';
import { bailoutSections, resultSections, type ResultSection } from '../../lib/crisisBanner';
import { recommendationCards } from '../../lib/recommendation';
import { RecommendationCards } from './RecommendationCards';
import type { CheckInNextAction } from '../../lib/spine/checkInPayload';
import type { Band } from '../../data/capacityTypes';
import { WitnessBeat } from '../witness/WitnessBeat';
import { beatBand, beatVariant, showsWitnessBeat, type WitnessHandlers } from '../../lib/witness';

interface LowEnergyStateResultProps {
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
 * Low-energy variant of the state result screen.
 * Shows pattern-specific context, guided activity CTA,
 * and de-emphasized tool cards. Used only for low-unpleasant
 * quadrant when a guided activity is available.
 *
 * A crisis safety flag adds <CrisisBanner /> above the result and the
 * micro-step screen, as in StateResult (layout from src/lib/crisisBanner.ts).
 * Today the server skips safety flags for low-unpleasant, so the banner can't
 * show here yet; it's wired so it can't regress into a dead end.
 */
export function LowEnergyStateResult({
  result,
  onDone,
  onAddMoreDetail,
  checkinEmotions,
  checkInId,
  onToolOpen,
  band,
  emotionIds,
  witness,
}: LowEnergyStateResultProps) {
  const { pattern, safetyFlag, coOccurrence, guidedActivity } = result;
  const cards = recommendationCards(result);
  const sections = resultSections({
    variant: 'low_energy',
    safetyFlag,
    patternId: pattern.id,
    toolCount: cards.length,
    hasGuidedActivity: !!guidedActivity,
    canAddMoreDetail: !!onAddMoreDetail,
  });
  const has = (section: ResultSection) => sections.includes(section);

  const [showActivity, setShowActivity] = useState(false);
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
    const timer = setTimeout(() => onDone({ kind: 'micro_step', microStepId: completedStepId }), 1800);
    return () => clearTimeout(timer);
  }, [isCompleting, onDone, completedStepId]);

  // ========== GUIDED ACTIVITY OVERLAY ==========
  if (showActivity && guidedActivity) {
    const activityDef = getActivityDefinition(guidedActivity.activityId);
    if (activityDef) {
      return (
        <GuidedActivity
          activity={activityDef}
          patternId={guidedActivity.patternId}
          secondaryPatternId={result.secondaryPattern?.id}
          onComplete={() => onDone({ kind: 'activity', activityId: guidedActivity.activityId })}
          onEarlyExit={() => onDone({ kind: 'activity_partial', activityId: guidedActivity.activityId })}
        />
      );
    }
  }

  // ========== BAILOUT COMPLETION ==========
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

  // ========== BAILOUT MICRO-STEP ==========
  if (bailoutStep) {
    return (
      <div>
        {bailoutSections(safetyFlag).includes('crisis_banner') && <CrisisBanner />}
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
          <p className="text-sm text-[var(--color-text-tertiary)] mb-8">
            That's okay. Let's go smaller.
          </p>
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
          <button
            onClick={() => handleBailoutComplete(bailoutStep.id)}
            className="w-full max-w-xs py-4 px-6 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium text-lg lift-primary"
          >
            I did it
          </button>
          <button
            onClick={() => {
              if (bailoutIndex === null) return;
              const { step, index } = getMicroStep(pattern.id, bailoutIndex);
              setBailoutStep(step);
              setBailoutIndex(index);
            }}
            className="mt-4 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Show me something else
          </button>
        </div>
      </div>
    );
  }

  // ========== MAIN LOW-ENERGY RESULT SCREEN ==========
  const contextSentence = PATTERN_CONTEXT[pattern.id] || '';
  const displayLabel = coOccurrence
    ? coOccurrence.combinedUserFacingLabel
    : pattern.userFacingLabel;

  return (
    <div className="py-4">
      {/* Crisis resources: a banner above the result, never instead of it */}
      {has('crisis_banner') && <CrisisBanner />}

      {/* Pattern label — larger, lighter weight, fades in */}
      <div className="text-center mb-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] mb-4">
          <span className="text-2xl">{getPatternEmoji(pattern.id)}</span>
        </div>

        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mb-3 leading-relaxed">
          {displayLabel}
        </h2>

        {contextSentence && (
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {contextSentence}
          </p>
        )}

        {pattern.confidence < 0.6 && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Based on what you've shared
          </p>
        )}
      </div>

      {/* The witness beat (A5-3, R21): below the banner, above the activity and tools; it never gates them */}
      {showsWitnessBeat(pattern.id) && (
        <WitnessBeat hostToolId="checkin" moment="checkin_result" band={beatBand(band)} variant={beatVariant(beatBand(band))}
          words={checkinEmotions ?? []} emotionIds={emotionIds}
          onShown={witness?.onShown} onDone={(r, lines) => witness?.onDone(r, lines)} />
      )}

      {/* Clinical referral */}
      {has('clinical_note') && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)]">
          <p className="text-[var(--color-q-hp-text)] text-sm">
            <strong>Note:</strong> {result.safetyFlag?.userCopy || 'If this feeling persists, consider reaching out to a mental health professional.'}
          </p>
        </div>
      )}

      {/* "Try something small" — primary CTA */}
      {has('guided_activity') && (
        <div className="mb-6">
          <button
            onClick={() => setShowActivity(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary"
          >
            Try something small
          </button>
        </div>
      )}

      {/* Tool cards — deprioritized visually */}
      {has('tools') && (
        <div className="mb-6">
          <p className="text-xs text-[var(--color-text-muted)] text-center mb-3">
            Or explore a tool
          </p>
          <RecommendationCards variant="compact" cards={cards} checkinEmotions={checkinEmotions} activationPatternId={pattern.id}
            checkInId={checkInId} onOpen={(toolId) => onToolOpen?.(toolId)} />
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => onDone({ kind: 'done' })}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-sm"
        >
          Done
        </button>

        {has('add_detail') && onAddMoreDetail && (
          <button
            onClick={onAddMoreDetail}
            className="w-full py-2.5 px-4 rounded-lg text-[var(--color-text-tertiary)] text-sm"
          >
            Add more detail to refine this
          </button>
        )}
      </div>

      {/* Bailout */}
      {has('bailout') && (
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              const { step, index } = getMicroStep(pattern.id);
              setBailoutStep(step);
              setBailoutIndex(index);
            }}
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
    conservation_freeze: '\uD83E\uDDCA',
    dissociation_overmodulation: '\uD83C\uDF2B\uFE0F',
    rumination_loop: '\uD83D\uDD04',
    reward_drive_low: '\uD83E\uDEAB',
  };
  return map[patternId] || '\uD83E\uDDE0';
}
