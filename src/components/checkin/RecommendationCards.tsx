import { Link } from 'react-router-dom';
import { fromCheckIn } from '../../lib/spine/toolLink';
import { cardHref, type RecommendationCard } from '../../lib/recommendation';
import { familyForTool } from '../../data/skillFamilies';
import { useOfficialNames } from '../../hooks/useOfficialNames';

const Chevron = ({ className }: { className: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
);

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
 * relevance words. Side labels (WMP-04 v0) head a card when the engine returned them. Standard cards
 * are tinted by skill family (src/data/skillFamilies.ts: teal get through it, lavender shift it, rose
 * with other people).
 */
export function RecommendationCards({ cards, variant = 'standard', checkInId, checkinEmotions, activationPatternId, onOpen }: RecommendationCardsProps) {
  // The admin "Official DBT names" switch is the one exception to "nothing from the graph": off, it is tool.name.
  const { label } = useOfficialNames();
  if (cards.length === 0) return null;
  const compact = variant === 'compact';
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {cards.map((card, index) => {
        const isPrimary = index === 0;
        const { tool } = card;
        const family = compact ? null : familyForTool(tool.id);
        return (
          <div key={tool.id}>
            {card.label && (
              <p className={`${compact ? 'text-xs' : 'text-[13px] font-bold'} text-[var(--color-text-tertiary)] ${index > 0 ? 'mt-3' : ''} mb-1.5`}>
                {card.label}
              </p>
            )}
            <Link
              to={cardHref(tool.id, activationPatternId)}
              state={fromCheckIn(checkInId, checkinEmotions, activationPatternId, { slot: card.slot, ruleId: card.ruleId ?? undefined })}
              onClick={() => onOpen?.(tool.id, card.slot)}
              className={compact
                ? 'block p-3 rounded-lg bg-[var(--color-bg-card-hover)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border)] transition-all'
                : 'tool-card'}
              data-family={family?.key ?? undefined}
            >
              {compact ? (
                <div className="flex items-center gap-3">
                  <span className="text-lg flex-shrink-0" aria-hidden="true">{tool.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{label(tool)}</h3>
                    <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-1">{tool.tagline}</p>
                  </div>
                  <Chevron className="text-[var(--color-text-muted)] flex-shrink-0" />
                </div>
              ) : (
                <>
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    {family && <span className="tool-card__family">{family.label}</span>}
                    <span className={`font-semibold text-[var(--color-text-primary)] ${isPrimary ? 'text-lg' : 'text-base'}`}>{label(tool)}</span>
                    <span className="text-[15px] leading-snug text-[var(--color-text-secondary)] line-clamp-2">{tool.tagline}</span>
                  </span>
                  <Chevron className="tool-card__chevron" />
                </>
              )}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
