import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import { familyForTool } from '../../data/skillFamilies';
import { getEmotionByName } from '../../data/emotions';
import { QUADRANT_ABBR } from '../../lib/feelingSquare';
import type { StateResult, ToolRecommendation } from '../../services/neo4j';

interface StateResultProps {
  result: StateResult;
  onDone: () => void;
  onAddMoreDetail?: () => void;
  checkinEmotions?: string[];
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
 */
export function StateResult({ result, onDone, onAddMoreDetail, checkinEmotions }: StateResultProps) {
  const { pattern, tools, safetyFlag } = result;

  // === Bailout state ===
  const [bailoutStep, setBailoutStep] = useState<MicroStep | null>(null);
  const [bailoutIndex, setBailoutIndex] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleBailoutComplete = useCallback(() => {
    setIsCompleting(true);
  }, []);

  useEffect(() => {
    if (!isCompleting) return;
    const timer = setTimeout(() => {
      onDone();
    }, 1800);
    return () => clearTimeout(timer);
  }, [isCompleting, onDone]);

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
          onClick={handleBailoutComplete}
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
    );
  }

  // ===========================================
  // RENDER: Crisis safety flag — NO bailout button here
  // ===========================================
  if (safetyFlag && safetyFlag.type === 'crisis') {
    return (
      <div className="text-center py-6">
        <div className="mb-6 p-4 rounded-2xl bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]">
          <span className="text-3xl mb-3 block">🆘</span>
          <h2 className="text-xl font-bold text-[var(--color-q-hu-text)] mb-2">
            We hear you
          </h2>
          <p className="text-[var(--color-q-hu-text)] mb-4">
            {safetyFlag.action}
          </p>
          <a
            href="tel:988"
            className="inline-block w-full py-3 px-4 rounded-lg bg-[var(--color-danger)] hover:opacity-90 text-[var(--color-on-danger)] font-medium transition-colors mb-3"
          >
            Call 988 (Suicide & Crisis Lifeline)
          </a>
          <a
            href="sms:741741?body=HELLO"
            className="inline-block w-full py-3 px-4 rounded-lg border border-[var(--color-q-hu-border)] text-[var(--color-q-hu-text)] font-medium hover:bg-[var(--color-q-hu-bg)] transition-colors"
          >
            Text HOME to 741741
          </a>
        </div>
      </div>
    );
  }

  // ===========================================
  // RENDER: Positive state — NO bailout button here
  // ===========================================
  if (pattern.id === 'positive_state') {
    return (
      <div className="max-w-md mx-auto py-2">
        <CheckInWords words={checkinEmotions} />
        <h2 className="mt-5 mb-0 text-[2rem] leading-[1.08] text-[var(--color-text-primary)] [text-wrap:pretty]">
          {pattern.userFacingLabel}
        </h2>
        <p className="mt-3 text-[16.5px] leading-relaxed text-[var(--color-text-secondary)]">
          No action needed right now. Enjoy this moment.
        </p>
        <button
          onClick={onDone}
          className="mt-8 w-full min-h-[56px] px-4 rounded-[18px] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-[17px] font-bold lift-primary"
        >
          Done
        </button>
      </div>
    );
  }

  // ===========================================
  // RENDER: Standard intervention view
  // Your words -> what is happening -> tools (colour-coded by family) -> actions -> bailout
  // ===========================================
  return (
    <div className="max-w-md mx-auto py-2">
      <CheckInWords words={checkinEmotions} />

      <h2 className="mt-5 mb-0 text-[2rem] leading-[1.08] text-[var(--color-text-primary)] [text-wrap:pretty]">
        {pattern.userFacingLabel}
      </h2>
      {pattern.confidence < 0.6 && (
        <p className="mt-3 text-[15px] text-[var(--color-text-tertiary)]">Based on what you’ve shared</p>
      )}

      {/* Clinical referral warning if needed */}
      {safetyFlag && safetyFlag.type === 'clinical_referral' && (
        <div className="mt-5 p-4 rounded-xl bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)]">
          <p className="text-[var(--color-q-hp-text)] text-sm">
            <strong>Note:</strong> If this feeling persists, consider reaching out to a mental health professional.
          </p>
        </div>
      )}

      {/* The Tools - 1-2 options, that's it */}
      {tools.length > 0 && (
        <div className="mt-7">
          <p className="m-0 mb-3 font-serif italic text-[17px] text-[var(--color-text-secondary)]">
            Here’s what might help right now
          </p>
          <div className="flex flex-col gap-3">
            {tools.slice(0, 2).map((tool, index) => (
              <ToolCard key={tool.id} tool={tool} isPrimary={index === 0} checkinEmotions={checkinEmotions} activationPatternId={pattern.id} />
            ))}
          </div>
        </div>
      )}

      {/* Primary actions */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={onDone}
          className="w-full min-h-[56px] px-4 rounded-[18px] bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] text-[17px] font-bold lift-primary"
        >
          Done
        </button>
        {onAddMoreDetail && (
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
      {tools.length > 0 && (
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
  );
}

/** The words picked in the check-in, each in its own quadrant colour. */
function CheckInWords({ words }: { words?: string[] }) {
  if (!words?.length) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-label="Your words">
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

function getToolPath(toolId: string): string {
  return `/tool/${toolId}`;
}

/** A recommended tool, tinted by its skill family (teal get through it, lavender shift it, rose with other people). */
function ToolCard({ tool, isPrimary, checkinEmotions, activationPatternId }: { tool: ToolRecommendation; isPrimary: boolean; checkinEmotions?: string[]; activationPatternId?: string }) {
  const family = familyForTool(tool.id);
  return (
    <Link
      to={getToolPath(tool.id)}
      state={toolLinkState(checkinEmotions, activationPatternId)}
      className="tool-card"
      data-family={family?.key ?? undefined}
    >
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        {family && <span className="tool-card__family">{family.label}</span>}
        <span className={`font-semibold text-[var(--color-text-primary)] ${isPrimary ? 'text-lg' : 'text-base'}`}>{tool.name}</span>
        <span className="text-[15px] leading-snug text-[var(--color-text-secondary)] line-clamp-2">
          {tool.description || tool.whenToUse}
        </span>
      </span>
      <svg className="tool-card__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
    </Link>
  );
}

/** Location state for tool links. Keeps the original { checkinEmotions } shape and adds the pattern id when known. */
function toolLinkState(checkinEmotions?: string[], activationPatternId?: string) {
  if (!checkinEmotions?.length && !activationPatternId) return undefined;
  return {
    ...(checkinEmotions?.length ? { checkinEmotions } : {}),
    ...(activationPatternId ? { activationPatternId } : {}),
  };
}
