import { Link } from 'react-router-dom';
import type { StateResult, ToolRecommendation } from '../../services/neo4j';

interface StateResultProps {
  result: StateResult;
  onDone: () => void;
  onAddMoreDetail?: () => void;
}

/**
 * "What's happening right now" — the single-screen neural state summary
 * 
 * Shows one cohesive state description (the userFacingLabel from the activation pattern),
 * followed by 1-2 recommended tools. No browsing, no menu of 40 tools.
 * 
 * The user came in feeling a vague soup of bad. We give them language for it
 * (affect labeling), and immediately follow with "here's what to do."
 */
export function StateResult({ result, onDone, onAddMoreDetail }: StateResultProps) {
  const { pattern, tools, safetyFlag } = result;

  // Handle safety-critical states first
  if (safetyFlag && safetyFlag.type === 'crisis') {
    return (
      <div className="text-center py-6">
        <div className="mb-6 p-5 rounded-[24px] bg-[#FEE2E2]/70 backdrop-blur-sm border border-[#FECACA] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <span className="text-4xl mb-4 block">🆘</span>
          <h2 className="text-xl font-bold text-[#991B1B] mb-3">
            We hear you
          </h2>
          <p className="text-[#B91C1C] mb-5">
            {safetyFlag.action}
          </p>
          <a
            href="tel:988"
            className="inline-block w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(185,28,28,0.3)] hover:shadow-[0_6px_20px_rgba(185,28,28,0.4)] mb-3"
          >
            Call 988 (Suicide & Crisis Lifeline)
          </a>
          <a
            href="sms:741741?body=HELLO"
            className="inline-block w-full py-3.5 px-4 rounded-2xl bg-white/70 border border-[#FECACA] text-[#B91C1C] font-semibold hover:bg-white/90 transition-all"
          >
            Text HOME to 741741
          </a>
        </div>
      </div>
    );
  }

  // Positive state - no intervention needed
  if (pattern.id === 'positive_state') {
    return (
      <div className="text-center py-6">
        <span className="text-6xl mb-4 block sparkle">🌟</span>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
          {pattern.userFacingLabel}
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-8">
          No action needed right now. Enjoy this moment.
        </p>
        <button
          onClick={onDone}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(155,89,182,0.4)]"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* The State Summary - one cohesive sentence */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-sage-100)] to-[var(--color-sage-200)] mb-4 shadow-[0_4px_16px_rgba(155,89,182,0.15),inset_0_2px_4px_rgba(255,255,255,0.8)]">
          <span className="text-3xl">{getPatternEmoji(pattern.id)}</span>
        </div>
        
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3 leading-relaxed">
          {pattern.userFacingLabel}
        </h2>
        
        {/* Confidence indicator - subtle, not distracting */}
        {pattern.confidence < 0.6 && (
          <p className="text-sm text-[var(--color-text-secondary)] mb-2">
            Based on what you've shared
          </p>
        )}
      </div>

      {/* Clinical referral warning if needed */}
      {safetyFlag && safetyFlag.type === 'clinical_referral' && (
        <div className="mb-6 p-4 rounded-[20px] bg-[#FEF3C7]/60 backdrop-blur-sm border border-[#FDE68A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <p className="text-[#92400E] text-sm">
            <strong>Note:</strong> If this feeling persists, consider reaching out to a mental health professional.
          </p>
        </div>
      )}

      {/* The Tools - 1-2 options, that's it */}
      {tools.length > 0 && (
        <div className="mb-8">
          <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
            ✨ Here's what might help right now
          </p>
          
          <div className="space-y-3">
            {tools.slice(0, 2).map((tool, index) => (
              <ToolCard key={tool.id} tool={tool} isPrimary={index === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={onDone}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white font-semibold transition-all shadow-[0_4px_16px_rgba(155,89,182,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_20px_rgba(155,89,182,0.4)]"
        >
          Done
        </button>
        
        {onAddMoreDetail && (
          <button
            onClick={onAddMoreDetail}
            className="w-full py-3.5 px-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-[var(--color-sage-300)] text-[var(--color-text-primary)] font-semibold hover:bg-white/90 hover:border-[#d4af37] transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] text-sm"
          >
            Add more detail to refine this
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A single tool card - minimal, actionable
 */
function ToolCard({ tool, isPrimary }: { tool: ToolRecommendation; isPrimary: boolean }) {
  const toolPath = getToolPath(tool.id);
  
  return (
    <Link
      to={toolPath}
      className={`
        block p-5 rounded-[20px] transition-all duration-200
        ${isPrimary 
          ? 'bg-gradient-to-r from-[var(--color-sage-500)] to-[var(--color-sage-600)] text-white shadow-[0_4px_20px_rgba(155,89,182,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_28px_rgba(155,89,182,0.35)] hover:scale-[1.01]' 
          : 'bg-white/70 backdrop-blur-sm text-[var(--color-text-primary)] border border-[var(--color-sage-200)] shadow-[0_2px_8px_rgba(155,89,182,0.1),inset_0_2px_4px_rgba(255,255,255,0.8)] hover:border-[#d4af37] hover:shadow-[0_4px_16px_rgba(212,175,55,0.2)]'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold ${isPrimary ? 'text-white' : 'text-[var(--color-text-primary)]'}`}>
            {formatToolName(tool.name || tool.id)}
          </h3>
          {tool.whenToUse && (
            <p className={`text-sm mt-1 leading-relaxed ${isPrimary ? 'text-white/80' : 'text-[var(--color-text-secondary)]'}`}>
              {truncate(tool.whenToUse, 60)}
            </p>
          )}
        </div>
        <span className={`text-xl ${isPrimary ? 'text-white/80' : 'text-[#d4af37]'}`}>
          →
        </span>
      </div>
    </Link>
  );
}

// Helper functions
function getPatternEmoji(patternId: string): string {
  const emojiMap: Record<string, string> = {
    'acute_alarm': '⚡',
    'chronic_vigilance': '👁️',
    'emotional_flooding': '🌊',
    'conservation_freeze': '🧊',
    'dissociation_overmodulation': '☁️',
    'rumination_loop': '🔄',
    'reward_drive_low': '🔋',
    'social_threat_shame': '🙈',
    'positive_state': '✨',
  };
  return emojiMap[patternId] || '💭';
}

function formatToolName(name: string): string {
  // Convert dbt_tipp to "TIPP", dbt_opposite_action to "Opposite Action"
  return name
    .replace(/^dbt_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Tipp/i, 'TIPP');
}

function getToolPath(toolId: string): string {
  // Map therapy concept IDs to actual tool routes
  const pathMap: Record<string, string> = {
    'dbt_tipp': '/tools/cool-down',
    'dbt_grounding': '/tools/five-senses',
    'dbt_opposite_action': '/tools/opposite-action',
    'dbt_paced_breathing': '/tools/pause',
    'dbt_behavioral_activation': '/tools/one-good-thing',
    'dbt_pleasant_activities': '/tools/one-good-thing',
  };
  return pathMap[toolId] || `/tools/${toolId.replace('dbt_', '')}`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}
