/**
 * The profile kind registry (docs/design/user-profile.md §4.2). Code, reviewed per PR like
 * PROFILE_NEEDS: a content load can never add a kind or widen what a tool may write. Copy (title,
 * "still true?" wording) and revisitAfterDays stay in the graph (`ProfileKind`, scripts/profile-layer).
 *
 * A module adds its kind here in the PR that ships the tool that keeps it, with: its label (registered
 * in userdata/layers.ts with a `<label>_key` constraint), its validator, which value fields are the
 * person's own words (`ownFields`: stored encrypted, shared/crypto.ts), and its limits. Every write goes
 * through profile/items.ts (keepProfileItem / editProfileItem / deleteProfileItem); no kind gets its own
 * writer. Parts are outside on purpose (parts/keep.ts is the only Part writer).
 *
 * Pure: no firebase imports, so tests load it directly.
 */
import { ValidationError, obj, str } from '../shared/validate';
import { isAskFreshField } from '../userdata/layers';
import { HHMM } from './meta';
import type { ProfileAreaId, SliceId } from './types';

export interface ProfileKindDef {
  kind: string;
  /** Neo4j label (whitelisted: it is interpolated into Cypher). */
  label: string;
  /** User → item relationship. */
  rel: string;
  area: ProfileAreaId;
  slice: SliceId | null;
  owner: 'CORE' | 'ER' | 'IE' | 'DT' | 'MF' | 'WMP';
  /** false: one per person (`id = kind`); true: many, each with a client UUID. */
  many: boolean;
  /** Most items a person may keep of this kind (active and resting; set-aside ones don't count). */
  maxItems: number;
  /** Which Me editor opens on "change" (null: not editable in place). */
  editor: string | null;
  /** Value fields that hold the person's own words: length-checked by `validate`, then stored encrypted. */
  ownFields: readonly string[];
  /** Throws ValidationError; returns the value to store. Ask-fresh fields are stripped after it runs. */
  validate(value: unknown): Record<string, unknown>;
}

export const PROFILE_KINDS: Record<string, ProfileKindDef> = {
  quiet_hours: {
    kind: 'quiet_hours', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_body', slice: 'quietHours',
    owner: 'CORE', many: false, maxItems: 1, editor: 'quiet_hours', ownFields: [],
    validate: (v) => {
      const o = obj(v);
      const start = str(o.start, { max: 5, pattern: HHMM });
      const end = str(o.end, { max: 5, pattern: HHMM });
      if (start === end) throw new ValidationError('Quiet hours need a start and an end');
      return { start, end };
    },
  },
};

/** The kind's definition, or a ValidationError (unknown kinds are refused, never guessed). */
export function kindDef(kind: unknown): ProfileKindDef {
  if (typeof kind !== 'string' || !Object.prototype.hasOwnProperty.call(PROFILE_KINDS, kind)) {
    throw new ValidationError('Unknown profile kind');
  }
  return PROFILE_KINDS[kind];
}

/** Validate a value for a kind and drop any ask-fresh field (they belong on log records only). */
export function checkValue(def: ProfileKindDef, value: unknown): Record<string, unknown> {
  const v = def.validate(value);
  return Object.fromEntries(Object.entries(v).filter(([k]) => !isAskFreshField(k)));
}

/** Labels and relationships the item writers accept, from the registry plus the pre-registry items. */
export function itemLabels(): Record<string, string> {
  const out: Record<string, string> = { ProfileFact: 'HAS_PROFILE_FACT', MyPattern: 'HAS_PATTERN', OwnLine: 'HAS_OWN_LINE' };
  for (const d of Object.values(PROFILE_KINDS)) out[d.label] = d.rel;
  return out;
}
