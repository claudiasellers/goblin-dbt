/**
 * What an embed takes from the skill (EMBED_PROPS in src/components/skillPlayer/embeds.ts, mirrored as
 * scripts/skills/content.py EMBED_PROPS; build.py checks every step's props against it). Copy props name a
 * key in the skill's copy, so every word an embed shows is graph copy, voice-checked with the rest; the
 * player swaps the key for its text before the embed sees it. Pure.
 */
import type { EmbedPropSpec } from '../../data/skillTypes';

export type { EmbedPropSpec } from '../../data/skillTypes';

/** The props as the embed receives them: copy keys resolved to text; a missing optional copy key is dropped. */
export function resolveEmbedProps(
  spec: Readonly<Record<string, EmbedPropSpec>> | undefined,
  props: Readonly<Record<string, unknown>> | undefined,
  copy: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    const s = spec?.[k];
    if (!s) continue;
    if (s.type === 'copy') {
      const text = typeof v === 'string' ? copy[v] : undefined;
      if (text) out[k] = text;
    } else {
      out[k] = v;
    }
  }
  return out;
}
