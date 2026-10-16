/**
 * What a kept part is made of, pure (docs/design/parts.md, "Meet a part → What's saved" and the
 * `Part` row of "Data model → User data"). Built only from the stored PartSession: the client sends
 * the session id, the new part's id and an optional name, nothing else. Never copies an ask-fresh
 * field (feelTowardIds, blendCheck, handoffs).
 */
import { GRAPH_ID, ValidationError, obj, uuid } from '../shared/validate';

const fail = (m: string): never => { throw new ValidationError(m); };

/** PartsPolicy.nameMaxChars when the policy is missing. */
export const DEFAULT_NAME_MAX = 40;
/** The `part` ProfileKind's revisitAfterDays when it is missing. */
export const DEFAULT_REVISIT_DAYS = 30;

export interface KeepInput { sessionId: string; partId: string; name: string | null | undefined }

/** `{ sessionId, partId, name? }` and nothing else: no part field can come from the client. */
export function validateKeep(raw: unknown): KeepInput {
  const o = obj(raw);
  for (const k of Object.keys(o)) if (!['sessionId', 'partId', 'name'].includes(k)) fail(`${k}: not accepted`);
  if (o.name !== undefined && o.name !== null && typeof o.name !== 'string') fail('name: expected text');
  return { sessionId: uuid(o.sessionId), partId: uuid(o.partId), name: o.name as string | null | undefined };
}

/**
 * The name as kept: trimmed, at most `max` characters, '' / null → null ("Not yet"), undefined →
 * undefined (not given: a revisit keeps the old one). Never linted or interpreted.
 */
export function keptName(name: string | null | undefined, max: number): string | null | undefined {
  if (name === undefined) return undefined;
  if (name === null) return null;
  const t = name.trim();
  if (t.length > max) fail(`name: over ${max} characters`);
  return t || null;
}

/** The stored session, as keepPart reads it. */
export interface StoredSession {
  trailheadKind: string | null;
  candidateId: string | null;
  /** The trail offer the visit came from (trailheadKind 'offer'). */
  offerId?: string | null;
  stepIdsJson: string | null;
  stopReason: string | null;
  bodyPlaces: string[] | null;
  shapeSig: number[] | null;
  soundSig: number[] | null;
  ownVoice: string | null;
  ownJob: string | null;
  ownFear: string | null;
}

/** The chips that answer a step without saying anything about the part ("Not sure", "Nothing", …). */
export const NON_ANSWER = /^(own_words|.*_not_sure|.*_nothing|.*_cant_tell|.*_not_yet)$/;

function stepIds(json: string | null): Record<string, string[]> {
  if (!json) return {};
  try {
    const m = JSON.parse(json) as unknown;
    if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string' && GRAPH_ID.test(x));
    }
    return out;
  } catch {
    return {};
  }
}

const answers = (ids: string[] | undefined) => (ids ?? []).filter((x) => !NON_ANSWER.test(x));

/**
 * Tender (presence only from now on): the visit took the tender path, chose "little" and accepted
 * "keep it gentle", or stopped on `tender` or `own_words` (unread text is the riskier case).
 */
export function isTender(s: Pick<StoredSession, 'stepIdsJson' | 'stopReason'>): boolean {
  const steps = stepIds(s.stepIdsJson);
  if (steps.tender !== undefined) return true;
  const age = steps.age ?? [];
  if (age.includes('age_little') && age.includes('young_gentle')) return true;
  return s.stopReason === 'tender' || s.stopReason === 'own_words';
}

/** Where the part came from: a candidate, an offer, or made from scratch. */
export function partSource(s: Pick<StoredSession, 'trailheadKind' | 'candidateId'>): 'made' | 'candidate' | 'offer' {
  if (s.candidateId || s.trailheadKind === 'candidate') return 'candidate';
  return s.trailheadKind === 'offer' ? 'offer' : 'made';
}

/** The part's own fields from one visit (no lifecycle fields: those are set in the Cypher). */
export interface PartFields {
  tender: boolean;
  places: string[];
  shapeSig: number[] | null;
  soundSig: number[] | null;
  ageId: string | null;
  voiceIds: string[];
  jobIds: string[];
  fearIds: string[];
  preferredRoleIds: string[];
  ownVoice: string | null;
  ownJob: string | null;
  ownFear: string | null;
}

export function partFromSession(s: StoredSession): PartFields & { guardIds: string[] } {
  const steps = stepIds(s.stepIdsJson);
  return {
    tender: isTender(s),
    places: [...(s.bodyPlaces ?? [])],
    shapeSig: s.shapeSig ?? null,
    soundSig: s.soundSig ?? null,
    // The age pick itself; "keep it gentle" / "keep going" are its follow-up, not an age.
    ageId: answers(steps.age).find((x) => x.startsWith('age_')) ?? null,
    voiceIds: answers(steps.voice),
    jobIds: answers(steps.job),
    fearIds: answers(steps.fear),
    preferredRoleIds: answers(steps.would_rather),
    ownVoice: s.ownVoice ?? null,
    ownJob: s.ownJob ?? null,
    ownFear: s.ownFear ?? null,
    guardIds: answers(steps.guards),
  };
}

const union = (a: unknown, b: string[]) => {
  const old = Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [];
  return [...old, ...b.filter((x) => !old.includes(x))];
};

/**
 * A revisit's yes on a part already kept: ids unioned in, own words replaced only where this visit
 * gave new ones, a new figure replaces the old. A real age answer replaces the stored one (a part's
 * felt age can change; the card shows it as it shows up now); a non-answer keeps it. Tenderness never
 * goes back. Never removes an id.
 */
export function mergeRevisit(existing: Record<string, unknown>, visit: PartFields): PartFields {
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const nums = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'number') ? (v as number[]) : null);
  return {
    tender: existing.tender === true || visit.tender,
    places: union(existing.places, visit.places),
    shapeSig: visit.shapeSig ?? nums(existing.shapeSig),
    soundSig: visit.soundSig ?? nums(existing.soundSig),
    ageId: visit.ageId ?? str(existing.ageId),
    voiceIds: union(existing.voiceIds, visit.voiceIds),
    jobIds: union(existing.jobIds, visit.jobIds),
    fearIds: union(existing.fearIds, visit.fearIds),
    preferredRoleIds: union(existing.preferredRoleIds, visit.preferredRoleIds),
    ownVoice: visit.ownVoice ?? str(existing.ownVoice),
    ownJob: visit.ownJob ?? str(existing.ownJob),
    ownFear: visit.ownFear ?? str(existing.ownFear),
  };
}
