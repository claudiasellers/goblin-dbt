/**
 * One person's trails from a read state, pure: episodes, then every enabled rule (or every rule, for
 * the dry run). Writes nothing and offers nothing: the offer task consumes the candidates.
 */
import { buildEpisodes } from './episodes';
import { evaluateTrails } from './rules';
import type { TrailState } from './queries';
import type { BlockedKey, Episode, TrailCandidate } from './types';

export interface TrailRun { episodes: Episode[]; conflicts: number; candidates: TrailCandidate[] }

export function trailsFromState(
  state: Pick<TrailState, 'records' | 'policy' | 'timeZone' | 'rules' | 'moves' | 'pairs' | 'contexts' | 'parts'>,
  now: number, opts: { allEnabled?: boolean; blocked?: BlockedKey[] } = {},
): TrailRun {
  const { episodes, conflicts } = buildEpisodes(state.records, state.policy, state.timeZone);
  const rules = opts.allEnabled ? state.rules.map((r) => ({ ...r, enabled: true })) : state.rules;
  const candidates = evaluateTrails(episodes, rules, {
    moves: state.moves, pairs: state.pairs, contexts: state.contexts, parts: state.parts, blocked: opts.blocked ?? [],
  }, now);
  return { episodes, conflicts, candidates };
}
