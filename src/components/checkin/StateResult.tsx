import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import type { StateResult } from '../../services/neo4j';
import { CrisisBanner } from '../safety/CrisisBanner';
import { bailoutSections, resultSections, type ResultSection } from '../../lib/crisisBanner';
import { recommendationCards } from '../../lib/recommendation';
import { RecommendationCards } from './RecommendationCards';
import { FeelingCardLink } from './FeelingCardLink';
import { fromCheckIn } from '../../lib/spine/toolLink';
import type { CheckInNextAction } from '../../lib/spine/checkInPayload';
import type { Band } from '../../data/capacityTypes';
import { WitnessBeat } from '../witness/WitnessBeat';
import { getEmotionByName } from '../../data/emotions';
import { QUADRANT_ABBR } from '../../lib/feelingSquare';
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
  /** The safety route ran this visit (any answer) or its people card shows: no feeling card link (ER-10 part 3). */
  quietCard?: boolean;
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
export function StateResult({ result, onDone, onAddMoreDetail, checkinEmotions, checkInId, onToolOpen, band, emotionIds, quietCard = false, witness }: StateResultProps) {
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
      <div className="max-w-md mx-auto text-center py-2">
        {has('crisis_banner') && <CrisisBanner />}
        <CheckInWords words={checkinEmotions} />
        <h2 className="mt-5 mb-0 text-[2rem] leading-[1.08] text-[var(--color-text-primary)] [text-wrap:balance]">
          {pattern.userFacingLabel}
        </h2>
        {/* ER-04 (docs/design/good-things.md): a good moment is worth staying with and keeping, never a dead end. */}
        <p className="mt-3 text-[16.5px] leading-relaxed text-[var(--color-text-secondary)]">
          Want to stay with it a moment, and keep it?
        </p>
        <Link
          to="/tool/good-things?frame=savour"
          state={fromCheckIn(checkInId, checkinEmotions, pattern.id)}
          onClick={() => onToolOpen?.('good-things')}
          className="mt-8 flex items-center justify-center w-full min-h-[56px] px-4 rounded-[18px] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-[17px] font-bold lift-primary"
        >
          Keep this one
        </Link>
        <button
          onClick={() => onDone({ kind: 'done' })}
          className="mt-3 w-full min-h-11 text-[16px] text-[var(--color-text-secondary)] underline underline-offset-2"
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
    <div className="max-w-md mx-auto">
    <div className="py-4">
      {/* Crisis resources: a banner above the result, never instead of it */}
      {has('crisis_banner') && <CrisisBanner />}

      {/* The State Summary - one cohesive sentence. The witness beat below echoes the words. */}
      <div className="text-center mb-6">
        <h2 className="m-0 text-[2rem] leading-[1.08] text-[var(--color-text-primary)] [text-wrap:balance]">
          {pattern.userFacingLabel}
        </h2>
        {pattern.confidence < 0.6 && (
          <p className="mt-3 text-[15px] text-[var(--color-text-tertiary)]">Based on what you’ve shared</p>
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
            <strong>Note:</strong> {safetyFlag?.userCopy || 'If this feeling persists, consider reaching out to a mental health professional.'}
          </p>
        </div>
      )}

      {/* The tools: one recommendation and one swap (E4-4), below the banner and the beat */}
      {has('tools') && (
        <div className="mb-8">
          <p className="m-0 mb-3 font-serif italic text-[17px] text-[var(--color-text-secondary)]">
            Here’s what might help right now
          </p>
          <RecommendationCards cards={cards} checkinEmotions={checkinEmotions} activationPatternId={pattern.id}
            checkInId={checkInId} onOpen={(toolId) => onToolOpen?.(toolId)} />
        </div>
      )}

      {/* The feeling card after naming (ER-10 part 3): one quiet link, never a screen before help; never after a safety
          visit, beside a crisis banner or clinical note, or on a flooded result */}
      {!quietCard && !has('crisis_banner') && !has('clinical_note') && result.routing?.band !== 'flooded' && (
        <FeelingCardLink className="mb-4" emotionIds={emotionIds ?? []} onOpen={() => onToolOpen?.('emotion-guide')}
          state={(word) => fromCheckIn(checkInId, [word], pattern.id)} />
      )}

      {/* Primary actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onDone({ kind: 'done' })}
          className="w-full min-h-[56px] px-4 rounded-[18px] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-[17px] font-bold lift-primary"
        >
          Done
        </button>
        {has('add_detail') && onAddMoreDetail && (
          <button onClick={onAddMoreDetail} className="den-chip w-full">
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
        <div className="mt-4 text-center">
          <button
            onClick={handleBailout}
            className="min-h-11 px-2 text-[15px] text-[var(--color-text-secondary)] underline underline-offset-4 bg-transparent border-none cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
          >
            That feels like too much right now
          </button>
        </div>
      )}
    </div>
    </div>
  );
}

/** The words picked in the check-in, each in its own quadrant colour (positive result; elsewhere the witness beat echoes them). */
function CheckInWords({ words }: { words?: string[] }) {
  if (!words?.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label="Your words">
      {words.map((w) => {
        const q = getEmotionByName(w)?.quadrant;
        const abbr = q ? QUADRANT_ABBR[q] : null;
        return (
          <span
            key={w}
            className="inline-flex items-center min-h-[34px] px-3.5 rounded-full font-serif italic text-[17px]"
            style={abbr
              ? { background: `var(--color-q-${abbr}-fill)`, color: 'var(--color-on-quadrant)' }
              : { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)' }}
          >
            {w.toLowerCase()}
          </span>
        );
      })}
    </div>
  );
}
