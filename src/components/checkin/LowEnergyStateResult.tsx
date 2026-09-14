import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMicroStep, type MicroStep } from '../../data/microSteps';
import { getActivityDefinition, PATTERN_CONTEXT } from '../../data/guidedActivities';
import { GuidedActivity } from '../activities/GuidedActivity';
import { getToolById } from '../../data/tools';
import type { StateResult, ToolRecommendation } from '../../services/neo4j';

interface LowEnergyStateResultProps {
  result: StateResult;
  onDone: () => void;
  onAddMoreDetail?: () => void;
  checkinEmotions?: string[];
}

/**
 * Low-energy variant of the state result screen.
 * Shows pattern-specific context, guided activity CTA,
 * and de-emphasized tool cards. Used only for low-unpleasant
 * quadrant when a guided activity is available.
 */
export function LowEnergyStateResult({
  result,
  onDone,
  onAddMoreDetail,
  checkinEmotions,
}: LowEnergyStateResultProps) {
  const { pattern, tools, safetyFlag, coOccurrence, guidedActivity } = result;

  const [showActivity, setShowActivity] = useState(false);
  const [bailoutStep, setBailoutStep] = useState<MicroStep | null>(null);
  const [bailoutIndex, setBailoutIndex] = useState<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleBailoutComplete = useCallback(() => {
    setIsCompleting(true);
  }, []);

  useEffect(() => {
    if (!isCompleting) return;
    const timer = setTimeout(() => onDone(), 1800);
    return () => clearTimeout(timer);
  }, [isCompleting, onDone]);

  // ========== SAFETY FLAG — identical to StateResult ==========
  if (safetyFlag && safetyFlag.type === 'crisis') {
    return (
      <div className="text-center py-6">
        <div className="mb-6 p-4 rounded-2xl bg-[var(--color-q-hu-bg)] border border-[var(--color-q-hu-border)]">
          <span className="text-3xl mb-3 block">🆘</span>
          <h2 className="text-xl font-bold text-[var(--color-q-hu-text)] mb-2">We hear you</h2>
          <p className="text-[var(--color-q-hu-text)] mb-4">{safetyFlag.action}</p>
          <a
            href="tel:988"
            className="inline-block w-full py-3 px-4 rounded-lg bg-[var(--color-danger)] hover:opacity-90 text-white font-medium transition-colors mb-3"
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

  // ========== GUIDED ACTIVITY OVERLAY ==========
  if (showActivity && guidedActivity) {
    const activityDef = getActivityDefinition(guidedActivity.activityId);
    if (activityDef) {
      return (
        <GuidedActivity
          activity={activityDef}
          patternId={guidedActivity.patternId}
          secondaryPatternId={result.secondaryPattern?.id}
          onComplete={onDone}
          onEarlyExit={onDone}
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
          onClick={handleBailoutComplete}
          className="w-full max-w-xs py-4 px-6 rounded-xl bg-[var(--color-accent-fill)] text-white font-medium text-lg lift-primary"
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
    );
  }

  // ========== MAIN LOW-ENERGY RESULT SCREEN ==========
  const contextSentence = PATTERN_CONTEXT[pattern.id] || '';
  const displayLabel = coOccurrence
    ? coOccurrence.combinedUserFacingLabel
    : pattern.userFacingLabel;

  return (
    <div className="py-4">
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

      {/* Clinical referral */}
      {safetyFlag && safetyFlag.type === 'clinical_referral' && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-q-hp-bg)] border border-[var(--color-q-hp-border)]">
          <p className="text-[var(--color-q-hp-text)] text-sm">
            <strong>Note:</strong> If this feeling persists, consider reaching out to a mental health professional.
          </p>
        </div>
      )}

      {/* "Try something small" — primary CTA */}
      {guidedActivity && (
        <div className="mb-6">
          <button
            onClick={() => setShowActivity(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-[var(--color-accent-fill)] text-white font-medium lift-primary"
          >
            Try something small
          </button>
        </div>
      )}

      {/* Tool cards — deprioritized visually */}
      {tools.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-[var(--color-text-muted)] text-center mb-3">
            Or explore a tool
          </p>
          <div className="space-y-2">
            {tools.slice(0, 2).map(tool => (
              <ToolCardCompact key={tool.id} tool={tool} checkinEmotions={checkinEmotions} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onDone}
          className="w-full py-3 px-4 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium lift-secondary text-sm"
        >
          Done
        </button>

        {onAddMoreDetail && (
          <button
            onClick={onAddMoreDetail}
            className="w-full py-2.5 px-4 rounded-lg text-[var(--color-text-tertiary)] text-sm"
          >
            Add more detail to refine this
          </button>
        )}
      </div>

      {/* Bailout */}
      {(tools.length > 0 || guidedActivity) && (
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

function ToolCardCompact({
  tool,
  checkinEmotions,
}: {
  tool: ToolRecommendation;
  checkinEmotions?: string[];
}) {
  const toolPath = `/tool/${tool.id}`;

  return (
    <Link
      to={toolPath}
      state={checkinEmotions?.length ? { checkinEmotions } : undefined}
      className="block p-3 rounded-lg bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all"
    >
      <div className="flex items-center gap-3">
        <span className="text-lg flex-shrink-0">{getToolById(tool.id)?.emoji || '🔧'}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{tool.name}</h3>
          <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-1">
            {tool.description || tool.whenToUse}
          </p>
        </div>
        <span className="text-[var(--color-text-muted)] flex-shrink-0">\u2192</span>
      </div>
    </Link>
  );
}
