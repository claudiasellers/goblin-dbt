/**
 * Steps that helped (lane 4, parts-steps-tried): the readout's `steps` for the review fixtures in
 * ./data.ts. Labels as the graph has them (schema/opposite-action-data.cypher ActionUrge steps and
 * default steps, schema/invalidation-recovery.cypher RecoveryExit titles). Kept in its own file so other
 * lanes' blocks in ./data.ts don't collide.
 */
import type { PartStats } from '../../src/data/partsTypes';

/** The chase part's card and Reflect block: one step twice, one once. */
export const CHASE_STEPS: PartStats['steps'] = [
  { stepId: 'recover:park', label: 'Park the replay', n: 2 },
  { stepId: 'oa:default_sadness:small', label: 'Do one tiny thing — sit up, open the blinds, send one text', n: 1 },
];

/** At its longest: three steps, the longest ActionUrge step in the graph, counts on two of them. */
export const LONG_STEPS: PartStats['steps'] = [
  { stepId: 'oa:envy-compare:bigger', label: 'Use the envy as information — what does it tell you about what YOU want? Take one step toward that', n: 4 },
  { stepId: 'oa:love-proximity:bigger', label: "Fill the time you'd spend thinking about them with something that builds your life", n: 2 },
  { stepId: 'recover:prefer', label: 'Loosen the "must"', n: 1 },
];
