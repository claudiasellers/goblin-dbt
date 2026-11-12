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
import { ValidationError, obj, oneOf, str, strArray } from '../shared/validate';
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
  // Rewrite the nightmare (ER-15, docs/design/nightmare-rescript.md): the new version the person kept, on the
  // keep step's *Keep it in Me* (the runtime's keep, R4: `<field>Ids` / `<field>Own`). Where it starts, what
  // changes, how it ends now: an option id or their own words each. Never what happens in the nightmare: no
  // field asks it. ProfileFact like quiet_hours (no new label, plan D2), so Me lists it under My plans.
  nightmare_script: {
    kind: 'nightmare_script', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: null,
    owner: 'ER', many: true, maxItems: 5, editor: null, ownFields: ['settingOwn', 'turnOwn', 'endingOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      for (const f of ['setting', 'turn', 'ending'] as const) {
        const ids = o[`${f}Ids`];
        const own = o[`${f}Own`];
        if (ids !== undefined) out[`${f}Ids`] = strArray(ids, { max: 1, item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (own !== undefined) out[`${f}Own`] = str(own, { max: f === 'setting' ? 60 : 90 });
      }
      for (const k of Object.keys(o)) if (!/^(setting|turn|ending)(Ids|Own)$/.test(k)) throw new ValidationError('Unexpected field');
      if (!out.turnIds && !out.turnOwn && !out.endingIds && !out.endingOwn) throw new ValidationError('Nothing to keep');
      return out;
    },
  },
  // Cope Ahead (ER-05 on the skill runtime, docs/design/cope-ahead.md): the plan the person kept, on the keep step's
  // *Keep this* (R4: `<field>Ids` / `<field>Own`). The ids the plan line is built from (src/lib/copeAheadPlan.ts
  // `planLine`, so Me and the keep card say the same words): the situation, the hardest moment, whether the "If" is
  // the pull (`forpullIds: ['pull']`), the pull, and one or two moves. Never a stored sentence, never a part.
  cope_ahead_plan: {
    kind: 'cope_ahead_plan', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: null,
    owner: 'ER', many: true, maxItems: 10, editor: null, ownFields: ['situationOwn', 'momentOwn', 'movesOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      const ids = (k: string, max: number, of?: readonly string[]) => {
        if (o[k] === undefined) return;
        out[k] = strArray(o[k], { max, item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (of && (out[k] as string[]).some((x) => !of.includes(x))) throw new ValidationError('Unexpected value');
      };
      ids('situationIds', 1);
      ids('momentIds', 1);
      ids('forpullIds', 1, ['pull']);
      // The pull is plan content only when it is the If (`forpullIds: ['pull']`); otherwise it is this visit's
      // ask-fresh answer (any pull, *Not sure* included) and is dropped before it is read.
      if (o.forpullIds !== undefined) ids('pullIds', 1, ['fight', 'chase', 'hide', 'blank']);
      ids('movesIds', 2);
      if (o.situationOwn !== undefined) out.situationOwn = str(o.situationOwn, { max: 140 });
      if (o.momentOwn !== undefined) out.momentOwn = str(o.momentOwn, { max: 140 });
      if (o.movesOwn !== undefined) out.movesOwn = str(o.movesOwn, { max: 90 });
      for (const k of Object.keys(o)) if (!/^(situation|moment|forpull|pull|moves)(Ids|Own)$/.test(k) || k === 'forpullOwn' || k === 'pullOwn') throw new ValidationError('Unexpected field');
      if (!(out.forpullIds as string[] | undefined)?.length) delete out.pullIds;
      const has = (k: string) => (Array.isArray(out[`${k}Ids`]) && (out[`${k}Ids`] as string[]).length > 0) || typeof out[`${k}Own`] === 'string';
      if (!has('moves') || (!has('moment') && !(out.forpullIds as string[] | undefined)?.length)) throw new ValidationError('Nothing to keep');
      return out;
    },
  },
  // Pros & cons card (DT-10, docs/design/pros-cons.md): the card the person kept on *Keep it in Me*, for one pull.
  // The runtime's keep (R4: `<field>Ids` / `<field>Own`): the pull, reasons not to further ahead (`long`), what acting
  // gives (`gives`; never asked for hurt myself), what holding off costs (`cost`) and gives (`keeps`). The field is
  // `pull`, never `urge`: `urgeIds` is ask-fresh and would be stripped. Read back by the `prosCons` slice, so Hold to
  // wait can replay it for the same pull.
  pros_cons: {
    kind: 'pros_cons', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: 'prosCons',
    owner: 'DT', many: true, maxItems: 12, editor: null, ownFields: ['pullOwn', 'longOwn', 'givesOwn', 'costOwn', 'keepsOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      const most = { pull: 1, long: 3, gives: 2, cost: 2, keeps: 2 } as const;
      for (const f of Object.keys(most) as Array<keyof typeof most>) {
        const ids = o[`${f}Ids`];
        const own = o[`${f}Own`];
        if (ids !== undefined) out[`${f}Ids`] = strArray(ids, { max: most[f], item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (own !== undefined) out[`${f}Own`] = str(own, { max: 90 });
      }
      for (const k of Object.keys(o)) if (!/^(pull|long|gives|cost|keeps)(Ids|Own)$/.test(k)) throw new ValidationError('Unexpected field');
      if (!out.pullIds && !out.pullOwn) throw new ValidationError('A card is for one pull');
      if (!out.longIds && !out.longOwn && !out.keepsIds && !out.keepsOwn) throw new ValidationError('Nothing to keep');
      return out;
    },
  },
  // People (IE-03 minimal, docs/design/people.md): someone the person wants help with. `label` is the nickname they
  // gave (own words, encrypted; "no real names needed"), `role` a presentation id (src/data/people.ts). `safe` /
  // `risk` / `safeAskedAt` are the answer to "Is it safe to bring hard things up with them?" (D4: asked in the host
  // flow the first time and after PEOPLE_SAFE_REASK_DAYS, or on *Things changed*); the person can leave them unset.
  // A person kept without a label is never stored: the picker keeps nobody it can't name back to them.
  person: {
    kind: 'person', label: 'Person', rel: 'HAS_PERSON', area: 'my_people', slice: 'people',
    owner: 'IE', many: true, maxItems: 30, editor: null, ownFields: ['label'],
    validate: (v) => {
      const o = obj(v);
      for (const k of Object.keys(o)) if (!PERSON_FIELDS.includes(k)) throw new ValidationError('Unexpected field');
      const label = str(o.label, { max: 40 }).trim();
      if (!label) throw new ValidationError('A person needs something to call them');
      const out: Record<string, unknown> = { label, role: oneOf(o.role, PERSON_ROLES) };
      if (o.safe != null) out.safe = oneOf(o.safe, PERSON_SAFE);
      if (o.risk != null) out.risk = oneOf(o.risk, PERSON_RISK);
      if (o.safeAskedAt != null) out.safeAskedAt = str(o.safeAskedAt, { max: 30, pattern: ISO_DAY });
      // A risk answer comes from the safety question's second step: only after *no* or *not sure*.
      if (out.risk && out.risk !== 'none' && out.safe === 'yes') throw new ValidationError('risk needs safe no or unsure');
      if ((out.safe || out.risk) && !out.safeAskedAt) throw new ValidationError('safeAskedAt goes with an answer');
      return out;
    },
  },
};

/** A skill option id (scripts/skills: snake_case). */
const OPTION_ID = /^[a-z][a-z0-9_]*$/;

/** People (IE-03): the role chips (presentation ids, src/data/people.ts), the safety answers and their fields. */
export const PERSON_ROLES = ['partner', 'parent', 'family', 'friend', 'boss', 'coworker', 'roommate', 'ex', 'other'] as const;
export const PERSON_SAFE = ['yes', 'no', 'unsure'] as const;
/** none: safe yes; invalidating: *it tends to go badly*; harm: *they might hurt or control me*; unstated: *rather not say*. */
export const PERSON_RISK = ['none', 'invalidating', 'harm', 'unstated'] as const;
const PERSON_FIELDS = ['label', 'role', 'safe', 'risk', 'safeAskedAt'];
/** An ISO date or date-time (the client's clock; only compared against PEOPLE_SAFE_REASK_DAYS). */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}(T[0-9:.]+Z?)?$/;

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
