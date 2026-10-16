/**
 * DEAR MAN's cope ahead per part (docs/design/parts.md, the DEAR MAN row and Phase 3): "Who might show
 * up in this conversation?" One screen in prep, after "What makes this hard?" and before the script.
 * A chosen part brings its anchor ("If {name} shows up:" and, under it, the person's own words or a
 * line they kept). Every word comes from the shipped parts content; nothing shows until all of it is
 * signed off (`flowReady`). Pure.
 */
import type { Band } from '../data/capacityTypes';
import type { PartsContent, PartsOption } from '../data/partsContentTypes';
import type { ProfileSlices } from '../data/profileTypes';
import { promptCopy, stepOptions, surfaceReady, type SurfaceIds } from './partsContent';
import { partChipLabel as unnamedOrName, UNNAMED_PROMPTS } from './partTag';

/** The screen's own prompts, then the shared unnamed-part chips ("The one in your {place}", "One you haven't named"). */
export const COPE_PROMPTS = [
  'cope_title', 'cope_anchor', 'cope_anchor_noname', 'cope_set_anchor', 'cope_set_anchor_noname', 'cope_save_failed',
  ...UNNAMED_PROMPTS,
] as const;
export const COPE_OPTIONS = ['cope_not_sure', 'cope_skip', 'cope_own', 'cope_change', 'cope_save'] as const;

/** What the screen's gate requires (scripts/parts/review.mjs reads it). */
export const COPE_REQUIRED: SurfaceIds = { prompts: COPE_PROMPTS, options: COPE_OPTIONS };

/** At most this many parts as chips, and this many kept lines to pick an anchor from. */
export const COPE_PART_CAP = 4;
export const COPE_LINE_CAP = 4;
/** The own-words field (setPartAnchor's limit, ANCHOR_MAX_CHARS). */
export const COPE_OWN_MAX = 90;

export function copeReady(content: PartsContent | null): boolean {
  return !!content && surfaceReady(content, COPE_REQUIRED);
}

export interface CopeGate {
  /** The setting (User.partsEnabled). */
  partsOn: boolean;
  /** Active or resting parts in the `parts` slice (it holds no others). */
  partCount: number;
  /** The cope copy ships (copeReady). */
  ready: boolean;
  /** The band this visit carries (a hand-over's, or the device's current reading), if any. */
  band: Band | null | undefined;
}

/**
 * Shown only with parts on, at least one kept part, the copy signed off, and not flooded. DEAR MAN
 * no longer asks the band (Claudia, 30 Sep), so a flooded hand-over from Recover still reaches prep:
 * the screen stays out of it rather than ask someone flooded who might show up.
 */
export function showCopeAhead(g: CopeGate): boolean {
  return g.partsOn && g.partCount > 0 && g.ready && g.band !== 'flooded';
}

type SlicePart = ProfileSlices['parts'][number];

/** The part chips: the slice's order (most recently visited first, then most recently kept), capped. */
export function copeParts(parts: readonly SlicePart[] | null | undefined): SlicePart[] {
  return (parts ?? []).slice(0, COPE_PART_CAP);
}

/** A slot filled as typed: a function replacement, so `$&` in a name stays literal. */
const withName = (copy: string, name: string) => copy.replace('{name}', () => name);
const nameOf = (name: string | null | undefined) => name?.trim() || null;

/**
 * The chip's words: the name as they gave it (drawn in the serif), or the shared unnamed lines the tag
 * row uses ("The one in your {place}", else "One you haven't named").
 */
export function partChipLabel(content: PartsContent, part: SlicePart): { text: string; named: boolean } {
  return { text: unnamedOrName(part, content), named: nameOf(part.name) !== null };
}

/** "If {name} shows up:" (or the unnamed wording); the anchor goes on its own line under it. */
export function anchorLead(content: PartsContent, name: string | null | undefined): string {
  const n = nameOf(name);
  return n ? withName(promptCopy(content, 'cope_anchor') ?? '', n) : promptCopy(content, 'cope_anchor_noname') ?? '';
}

/** "What would help if {name} shows up?" (or the unnamed wording). */
export function setAnchorLine(content: PartsContent, name: string | null | undefined): string {
  const n = nameOf(name);
  return n ? withName(promptCopy(content, 'cope_set_anchor') ?? '', n) : promptCopy(content, 'cope_set_anchor_noname') ?? '';
}

/** The screen's chips by id (content order kept for Not sure / Skip). */
export function copeChips(content: PartsContent): Record<(typeof COPE_OPTIONS)[number], PartsOption | null> {
  const opts = stepOptions(content, 'dearman', 'cope');
  const by = (id: string) => opts.find((o) => o.id === id) ?? null;
  return {
    cope_not_sure: by('cope_not_sure'), cope_skip: by('cope_skip'), cope_own: by('cope_own'),
    cope_change: by('cope_change'), cope_save: by('cope_save'),
  };
}

export interface KeptLine { lineId: string; text: string; at: string | null }

/**
 * The lines they've kept, to pick an anchor from: their own ("say it my way") and the witness lines
 * they kept, newest first, at most four, empty text dropped and the same words once.
 */
export function keptLines(
  ownLines: ProfileSlices['ownLines'] | null | undefined,
  savedLines: ProfileSlices['savedLines'] | null | undefined,
): KeptLine[] {
  const all: KeptLine[] = [
    ...(ownLines ?? []).map((o) => ({ lineId: o.id, text: o.text, at: o.meta?.confirmedAt ?? o.lastUsedAt ?? null })),
    ...(savedLines ?? []).map((l) => ({ lineId: l.lineId, text: l.text, at: l.confirmedAt })),
  ].filter((l) => typeof l.text === 'string' && l.text.trim() !== '');
  const t = (at: string | null) => (at ? Date.parse(at) || 0 : 0);
  const sorted = all.map((l, i) => ({ l, i })).sort((a, b) => t(b.l.at) - t(a.l.at) || a.i - b.i).map((x) => x.l);
  const seen = new Set<string>();
  const out: KeptLine[] = [];
  for (const l of sorted) {
    const k = l.text.trim();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
    if (out.length === COPE_LINE_CAP) break;
  }
  return out;
}

/** Own words as setPartAnchor takes them: trimmed, 1 to 90 characters, or null when not sendable. */
export function ownAnchor(text: string): string | null {
  const t = text.trim();
  return t && t.length <= COPE_OWN_MAX ? t : null;
}

/** DEAR MAN's ext for the pick: the part id, or null to clear it (Not sure / Skip). Ids only. */
export function copeExt(partId: string | null): { er: { copeAheadPartId: string | null } } {
  return { er: { copeAheadPartId: partId } };
}
