import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import { getToolById } from '../../data/tools';
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
          className="w-full max-w-xs py-4 px-6 rounded-xl bg-[var(--color-accent-fill)] text-white font-medium text-lg lift-primary"
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
      <div className="text-center py-6">
        <span className="text-5xl mb-4 block">✨</span>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
          {pattern.userFacingLabel}
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-8">
          No action needed right now. Enjoy this moment.
        </p>
        <button
          onClick={onDone}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
        >
          Done
        </button>
      </div>
    );
  }

  // ===========================================
  // RENDER: Standard intervention view
  // State label -> tools -> actions -> bailout escape hatch
  // ===========================================
  return (
    <div className="py-4">
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

      {/* Clinical referral warning if needed */}
      {safetyFlag && safetyFlag.type === 'clinical_referral' && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)]">
          <p className="text-[var(--color-q-hp-text)] text-sm">
            <strong>Note:</strong> If this feeling persists, consider reaching out to a mental health professional.
          </p>
        </div>
      )}

      {/* The Tools - 1-2 options, that's it */}
      {tools.length > 0 && (
        <div className="mb-8">
          <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
            Here's what might help right now
          </p>
          
          <div className="space-y-3">
            {tools.slice(0, 2).map((tool, index) => (
              <ToolCard key={tool.id} tool={tool} isPrimary={index === 0} checkinEmotions={checkinEmotions} />
            ))}
          </div>
        </div>
      )}

      {/* Primary actions */}
      <div className="space-y-3">
        <button
          onClick={onDone}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
        >
          Done
        </button>
        
        {onAddMoreDetail && (
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
      {tools.length > 0 && (
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

function getToolPath(toolId: string): string {
  return `/tool/${toolId}`;
}

function ToolCard({ tool, isPrimary, checkinEmotions }: { tool: ToolRecommendation; isPrimary: boolean; checkinEmotions?: string[] }) {
  const toolPath = getToolPath(tool.id);

  return (
    <Link
      to={toolPath}
      state={checkinEmotions?.length ? { checkinEmotions } : undefined}
      className={`
        block p-4 rounded-xl transition-all
        ${isPrimary 
          ? 'bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] hover:border-[var(--color-border-accent)]' 
          : 'bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)]'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0 mt-0.5">
          {getToolById(tool.id)?.emoji || '🔧'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-[var(--color-text-primary)] ${isPrimary ? 'text-base' : 'text-sm'}`}>
            {tool.name}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
            {tool.description || tool.whenToUse}
          </p>
          {isPrimary && tool.relevance && (
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1 italic">
              {tool.relevance}
            </p>
          )}
        </div>
        <span className="text-[var(--color-text-muted)] flex-shrink-0 mt-1">\u2192</span>
      </div>
    </Link>
  );
}

