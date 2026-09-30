import { Link } from 'react-router-dom';
import { fromCheckIn } from '../../lib/spine/toolLink';
import type { RecommendationCard } from '../../lib/recommendation';

interface RecommendationCardsProps {
  /** From `recommendationCards(result)`: known tools only, ≤ 2, labels already decided. */
  cards: RecommendationCard[];
  /** `standard` (StateResult) or `compact` (LowEnergyStateResult, below the guided activity). */
  variant?: 'standard' | 'compact';
  checkInId?: string;
  checkinEmotions?: string[];
  activationPatternId?: string;
  /** A card tap (recorded as the check-in's next action; navigation doesn't wait). */
  onOpen?: (toolId: string, slot: 'primary' | 'swap') => void;
}

/**
 * The check-in result's cards (plan E4-4): one recommendation and at most one swap. Name, emoji and
 * tagline come from src/data/tools.ts (join pattern); nothing from the graph is shown, including
 * relevance words. Side labels (WMP-04 v0) head a card when the engine returned them.
 */
export function RecommendationCards({ cards, variant = 'standard', checkInId, checkinEmotions, activationPatternId, onOpen }: RecommendationCardsProps) {
  if (cards.length === 0) return null;
  const compact = variant === 'compact';
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {cards.map((card, index) => {
        const isPrimary = index === 0;
        const { tool } = card;
        return (
          <div key={tool.id}>
            {card.label && (
              <p className={`${compact ? 'text-xs' : 'text-sm'} text-[var(--color-text-tertiary)] ${index > 0 ? 'mt-3' : ''} mb-1.5`}>
                {card.label}
              </p>
            )}
            <Link
              to={`/tool/${tool.id}`}
              state={fromCheckIn(checkInId, checkinEmotions, activationPatternId, { slot: card.slot, ruleId: card.ruleId ?? undefined })}
              onClick={() => onOpen?.(tool.id, card.slot)}
              className={compact
                ? 'block p-3 rounded-lg bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all'
                : `block p-4 rounded-xl transition-all ${isPrimary
                  ? 'bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] hover:border-[var(--color-border-accent)]'
                  : 'bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)]'}`}
            >
              <div className={`flex ${compact ? 'items-center' : 'items-start'} gap-3`}>
                <span className={`${compact ? 'text-lg' : 'text-xl mt-0.5'} flex-shrink-0`} aria-hidden="true">{tool.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h3 className={compact
                    ? 'text-sm font-medium text-[var(--color-text-primary)]'
                    : `font-semibold text-[var(--color-text-primary)] ${isPrimary ? 'text-base' : 'text-sm'}`}>
                    {tool.name}
                  </h3>
                  <p className={compact
                    ? 'text-xs text-[var(--color-text-tertiary)] line-clamp-1'
                    : 'text-sm text-[var(--color-text-secondary)] mt-0.5 line-clamp-2'}>
                    {tool.tagline}
                  </p>
                </div>
                <span className={`text-[var(--color-text-muted)] flex-shrink-0 ${compact ? '' : 'mt-1'}`} aria-hidden="true">{'→'}</span>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
