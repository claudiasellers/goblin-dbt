/**
 * "Show ids" for the review harness: with #ids=1 every parts line the real components draw carries its
 * content id after it (prompts, chips, moves, hurts), so a reviewer can write notes by id. Slots like
 * {move} and {name} are kept, so the components fill them as usual. Read once, when parts.json loads.
 */
import type { PartsContent } from '../../src/data/partsContentTypes';

export const showIds = (): boolean => typeof location !== 'undefined' && new URLSearchParams(location.hash.slice(1)).get('ids') === '1';
const tag = (text: string, id: string) => `${text} ⟨${id}⟩`;

export function withIds(content: PartsContent): PartsContent {
  if (!showIds()) return content;
  return {
    ...content,
    prompts: Object.fromEntries(Object.entries(content.prompts).map(([id, p]) => [id, { ...p, copy: tag(p.copy, id) }])),
    options: Object.fromEntries(Object.entries(content.options).map(([flow, steps]) => [flow, Object.fromEntries(
      Object.entries(steps).map(([step, list]) => [step, list.map((o) => ({ ...o, label: tag(o.label, o.id) }))]),
    )])),
    moves: content.moves.map((m) => ({ ...m, label: tag(m.label, m.id), unblendPhrase: tag(m.unblendPhrase, m.id) })),
    hurts: content.hurts.map((h) => ({ ...h, label: tag(h.label, h.id) })),
  };
}
