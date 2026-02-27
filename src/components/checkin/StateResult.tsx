import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
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
          <p className="text-xl text-[var(--color-sage-700)] font-medium leading-relaxed">
            That counts.
          </p>
          <p className="text-xl text-[var(--color-sage-700)] font-medium leading-relaxed">
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
        <p className="text-sm text-[var(--color-sage-500)] mb-8">
          That's okay. Let's go smaller.
        </p>

        {/* THE INSTRUCTION — the only thing that matters on this screen */}
        <div className="text-center mb-12 max-w-sm">
          <p className="text-2xl sm:text-3xl font-semibold text-[var(--color-sage-800)] leading-snug mb-4">
            {bailoutStep.text}
          </p>
          {bailoutStep.subtext && (
            <p className="text-base text-[var(--color-sage-500)] leading-relaxed">
              {bailoutStep.subtext}
            </p>
          )}
        </div>

        {/* Single primary action */}
        <button
          onClick={handleBailoutComplete}
          className="w-full max-w-xs py-4 px-6 rounded-xl bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium text-lg transition-colors"
        >
          I did it
        </button>

        {/* Subtle cycle option — for accessibility (e.g., step requires cold water but user is in bed) */}
        <button
          onClick={handleShowAnother}
          className="mt-4 text-sm text-[var(--color-sage-400)] hover:text-[var(--color-sage-600)] transition-colors"
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
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200">
          <span className="text-3xl mb-3 block">🆘</span>
          <h2 className="text-xl font-bold text-red-800 mb-2">
            We hear you
          </h2>
          <p className="text-red-700 mb-4">
            {safetyFlag.action}
          </p>
          <a
            href="tel:988"
            className="inline-block w-full py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors mb-3"
          >
            Call 988 (Suicide & Crisis Lifeline)
          </a>
          <a
            href="sms:741741?body=HELLO"
            className="inline-block w-full py-3 px-4 rounded-lg border border-red-300 text-red-700 font-medium hover:bg-red-50 transition-colors"
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
        <h2 className="text-2xl font-bold text-[var(--color-sage-800)] mb-3">
          {pattern.userFacingLabel}
        </h2>
        <p className="text-[var(--color-sage-600)] mb-8">
          No action needed right now. Enjoy this moment.
        </p>
        <button
          onClick={onDone}
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-sage-100)] mb-4">
          <span className="text-2xl">{getPatternEmoji(pattern.id)}</span>
        </div>
        
        <h2 className="text-xl font-bold text-[var(--color-sage-800)] mb-3 leading-relaxed">
          {pattern.userFacingLabel}
        </h2>
        
        {pattern.confidence < 0.6 && (
          <p className="text-sm text-[var(--color-sage-500)] mb-2">
            Based on what you've shared
          </p>
        )}
      </div>

      {/* Clinical referral warning if needed */}
      {safetyFlag && safetyFlag.type === 'clinical_referral' && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-amber-800 text-sm">
            <strong>Note:</strong> If this feeling persists, consider reaching out to a mental health professional.
          </p>
        </div>
      )}

      {/* The Tools - 1-2 options, that's it */}
      {tools.length > 0 && (
        <div className="mb-8">
          <p className="text-sm text-[var(--color-sage-600)] text-center mb-4">
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
          className="w-full py-3 px-4 rounded-lg bg-[var(--color-sage-600)] hover:bg-[var(--color-sage-700)] text-white font-medium transition-colors"
        >
          Done
        </button>
        
        {onAddMoreDetail && (
          <button
            onClick={onAddMoreDetail}
            className="w-full py-3 px-4 rounded-lg border border-[var(--color-sage-300)] text-[var(--color-sage-600)] font-medium hover:bg-[var(--color-sage-50)] transition-colors text-sm"
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
            className="text-sm text-[var(--color-sage-400)] hover:text-[var(--color-sage-600)] transition-colors"
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
          ? 'bg-[var(--color-sage-100)] border-2 border-[var(--color-sage-300)] hover:border-[var(--color-sage-400)]' 
          : 'bg-[var(--color-sage-50)] border border-[var(--color-sage-200)] hover:border-[var(--color-sage-300)]'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl flex-shrink-0 mt-0.5">
          {getToolEmoji(tool.id)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-[var(--color-sage-800)] ${isPrimary ? 'text-base' : 'text-sm'}`}>
            {tool.name}
          </h3>
          <p className="text-sm text-[var(--color-sage-600)] mt-0.5 line-clamp-2">
            {tool.description || tool.whenToUse}
          </p>
          {isPrimary && tool.relevance && (
            <p className="text-xs text-[var(--color-sage-500)] mt-1 italic">
              {tool.relevance}
            </p>
          )}
        </div>
        <span className="text-[var(--color-sage-400)] flex-shrink-0 mt-1">\u2192</span>
      </div>
    </Link>
  );
}

function getToolEmoji(toolId: string): string {
  const map: Record<string, string> = {
    'cool-down': '\uD83E\uDDCA',
    'five-senses': '\uD83D\uDC41\uFE0F',
    'pause': '\u270B',
    'urge-surfing': '\uD83C\uDF0A',
    'name-it': '\uD83C\uDFF7\uFE0F',
    'opposite-action': '\u21A9\uFE0F',
    'radical-acceptance': '\uD83D\uDE4F',
    'pleasant-activities': '\uD83C\uDF31',
    'dear-man': '\uD83D\uDCAC',
    'boundaries': '\uD83D\uDEE1\uFE0F',
    'repair': '\uD83E\uDD1D',
    'validation': '\uD83D\uDC9B',
    'mindful-breathing': '\uD83E\uDEC1',
    'body-scan': '\uD83D\uDCE1',
    'wise-mind': '\uD83E\uDDD8',
    'observe-describe': '\uD83D\uDC40',
  };
  return map[toolId] || '\uD83D\uDD27';
}
