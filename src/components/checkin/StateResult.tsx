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

  // Positive state - no intervention needed
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
        
        {/* Confidence indicator - subtle, not distracting */}
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
              <ToolCard key={tool.id} tool={tool} isPrimary={index === 0} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
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
        block p-4 rounded-xl transition-all
        ${isPrimary 
          ? 'bg-[var(--color-sage-600)] text-white shadow-lg hover:shadow-xl hover:bg-[var(--color-sage-700)]' 
          : 'bg-[var(--color-sage-100)] text-[var(--color-sage-800)] hover:bg-[var(--color-sage-200)]'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-semibold ${isPrimary ? 'text-white' : 'text-[var(--color-sage-800)]'}`}>
            {formatToolName(tool.name || tool.id)}
          </h3>
          {tool.whenToUse && (
            <p className={`text-sm mt-1 ${isPrimary ? 'text-white/80' : 'text-[var(--color-sage-600)]'}`}>
              {truncate(tool.whenToUse, 60)}
            </p>
          )}
        </div>
        <span className={`text-xl ${isPrimary ? 'text-white/80' : 'text-[var(--color-sage-400)]'}`}>
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
