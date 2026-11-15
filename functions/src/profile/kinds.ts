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

/** Running low's rows that Me can leave out (scripts/skills/please_skill.py HIDEABLE; a test keeps them equal). */
export const PLEASE_HIDEABLE_ROWS = ['food', 'body', 'subs', 'moved'] as const;
/** Rebel's rebellions that last (scripts/skills/alternate_rebellion.py `LASTING`, test-pinned): never a kit card. */
export const REBELLION_LASTING = ['tattoo', 'piercing', 'hair_short', 'hair_colour'] as const;

/**
 * Sleep reset's wake times (scripts/skills/sleep_reset.py `WAKE`, test-pinned): 6:00 to 9:30 by half hours, then shift and
 * night times by the hour. The anchor a person keeps is one of them.
 */
export const SLEEP_WAKE_IDS = [
  'w0600', 'w0630', 'w0700', 'w0730', 'w0800', 'w0830', 'w0900', 'w0930',
  'w1000', 'w1100', 'w1200', 'w1300', 'w1400', 'w1500', 'w1600', 'w1700', 'w1800', 'w1900',
  'w2000', 'w2100', 'w2200', 'w2300', 'w0000', 'w0100', 'w0200', 'w0300', 'w0400', 'w0500',
] as const;

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
  // What matters to me (ER-09, docs/design/values.md): the person's value sort, one per person (a re-sort replaces
  // it): `mine` (every card that sounded like them, or their own words) and `kept` (up to three for now; empty is
  // *not sure yet*, a full answer). The runtime's keep (R4). Read back by the `values` slice (the kept ones, named
  // there from the graph's SkillOptions or their words); revisited monthly in Me (*Are these still yours?*).
  values: {
    kind: 'values', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'about_me', slice: 'values',
    owner: 'ER', many: false, maxItems: 1, editor: null, ownFields: ['mineOwn', 'keptOwn'],
    validate: (v) => {
      const o = obj(v);
      const most = { mine: 30, sometimes: 30, kept: 3 } as const;
      const out: Record<string, unknown> = {};
      // `sometimes`: the sort's middle pile (ids only: own words go in *that's me*).
      for (const f of ['mine', 'sometimes', 'kept'] as const) {
        const ids = o[`${f}Ids`];
        const own = o[`${f}Own`];
        if (ids !== undefined) out[`${f}Ids`] = strArray(ids, { max: most[f], item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (own !== undefined && f !== 'sometimes') out[`${f}Own`] = str(own, { max: 60 });
      }
      for (const k of Object.keys(o)) if (!/^(mine|kept)(Ids|Own)$|^sometimesIds$/.test(k)) throw new ValidationError('Unexpected field');
      const has = (k: string) => (Array.isArray(out[`${k}Ids`]) && (out[`${k}Ids`] as string[]).length > 0) || (typeof out[`${k}Own`] === 'string' && (out[`${k}Own`] as string).trim() !== '');
      if (!has('mine') && !has('sometimes')) throw new ValidationError('Nothing to keep');
      return out;
    },
  },
  // Good things (ER-04, docs/design/good-things.md): one thing the person likes, kept on *Keep it* (a found thing:
  // `kind`, the chip, or a few words) or *Add it* (a good thing that left them lighter: `pick`, a catalogue id or a few
  // words). The runtime's keep (R4: `<field>Ids` / `<field>Own`). Read back by the `thingsILike` slice, named there
  // (own words, else the option's label from the graph), so the next visit can offer it first. The week plan's
  // `wk<n>Own` are listed too: the validator stores them as `pickOwn`, but listing them keeps every own-words field
  // a keep can send under encryption should that mapping ever change (skill-contracts C2).
  thing_i_like: {
    kind: 'thing_i_like', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_words', slice: 'thingsILike',
    owner: 'ER', many: true, maxItems: 60, editor: null, ownFields: ['kindOwn', 'pickOwn', 'wk1Own', 'wk2Own', 'wk3Own'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      // The week plan's good things (`wk1`–`wk3`, one field per slot) are picks like level 1's: stored as `pick`.
      const fields = ['kind', 'pick', 'wk1', 'wk2', 'wk3'] as const;
      if (fields.filter((f) => f !== 'kind' && (o[`${f}Ids`] !== undefined || o[`${f}Own`] !== undefined)).length > 1) throw new ValidationError('One pick');
      for (const f of fields) {
        const to = f === 'kind' ? 'kind' : 'pick';
        const ids = o[`${f}Ids`];
        const own = o[`${f}Own`];
        if (ids !== undefined) out[`${to}Ids`] = strArray(ids, { max: 1, item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (own !== undefined) out[`${to}Own`] = str(own, { max: 40 });
      }
      for (const k of Object.keys(o)) if (!/^(kind|pick|wk[123])(Ids|Own)$/.test(k)) throw new ValidationError('Unexpected field');
      const has = (k: string) => (Array.isArray(out[`${k}Ids`]) && (out[`${k}Ids`] as string[]).length > 0) || (typeof out[`${k}Own`] === 'string' && (out[`${k}Own`] as string).trim() !== '');
      if (!has('kind') && !has('pick')) throw new ValidationError('Nothing to keep');
      return out;
    },
  },
  // Build mastery (ER-11, docs/design/build-mastery.md): one step the person did (done or partly), kept on the done
  // card's *Yes, add it* to their I can list. The runtime's keep (R4: `rungIds`, the ladder's option id, or `rungOwn`).
  // Me names it (own words, else the option's label from the graph); the `iCanRungs` slice keeps a ladder step from
  // being kept twice.
  i_can: {
    kind: 'i_can', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'about_me', slice: 'iCanRungs',
    owner: 'ER', many: true, maxItems: 100, editor: null, ownFields: ['areaOwn', 'rungOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      // The area comes along (an id, or the person's words), so a general step still says what it was for.
      for (const f of ['area', 'rung'] as const) {
        if (o[`${f}Ids`] !== undefined) out[`${f}Ids`] = strArray(o[`${f}Ids`], { max: 1, item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (o[`${f}Own`] !== undefined) out[`${f}Own`] = str(o[`${f}Own`], { max: 60 });
      }
      for (const k of Object.keys(o)) if (!/^(area|rung)(Ids|Own)$/.test(k)) throw new ValidationError('Unexpected field');
      const has = ((out.rungIds as string[] | undefined)?.length ?? 0) > 0 || (typeof out.rungOwn === 'string' && out.rungOwn.trim() !== '');
      if (!has) throw new ValidationError('Nothing to keep');
      return out;
    },
  },
  // Running low (ER-07, docs/design/running-low.md): the rows the person would rather not see, set in Me → My body (the
  // tap there is the yes). Sleep, the opening screen, is always asked (and always skippable); the rest can be left out.
  please_rows: {
    kind: 'please_rows', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_body', slice: 'pleaseRows',
    owner: 'ER', many: false, maxItems: 1, editor: 'please_rows', ownFields: [],
    validate: (v) => {
      const o = obj(v);
      for (const k of Object.keys(o)) if (k !== 'hidden') throw new ValidationError('Unexpected field');
      const hidden = strArray(o.hidden ?? [], { max: PLEASE_HIDEABLE_ROWS.length, item: (x) => oneOf(x, PLEASE_HIDEABLE_ROWS) });
      return { hidden: [...new Set(hidden)] };
    },
  },
  // Sleep reset (ER-13 part 2, docs/design/sleep-reset.md): the wake time a person keeps as their anchor, on the plan's
  // *Keep this wake time in Me?* (the chip is the yes; picking the kept time again re-confirms it). One per person (keeping a new time replaces it), My body, a wake id only.
  // Read back by the `sleepAnchor` slice: the next plan lists it first under *Still your time?*, never picked for them.
  sleep_anchor: {
    kind: 'sleep_anchor', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_body', slice: 'sleepAnchor',
    owner: 'ER', many: false, maxItems: 1, editor: null, ownFields: [],
    validate: (v) => {
      const o = obj(v);
      for (const k of Object.keys(o)) if (k !== 'wakeIds') throw new ValidationError('Unexpected field');
      const ids = strArray(o.wakeIds ?? [], { max: 1, item: (x) => oneOf(x, SLEEP_WAKE_IDS) });
      if (ids.length !== 1) throw new ValidationError('One wake time');
      return { wakeIds: ids };
    },
  },
  crisis_kit: {
    // DT-03 My crisis kit (docs/design/crisis-kit.md): one per person (keeping it again replaces it), option ids and own
    // words per section; the kit plays it one card at a time through the `crisisKit` slice.
    kind: 'crisis_kit', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: 'crisisKit',
    owner: 'DT', many: false, maxItems: 1, editor: null,
    ownFields: ['bodyOwn', 'handsOwn', 'sootheOwn', 'wordsOwn', 'placeOwn', 'reasonsOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      const most = { body: 3, hands: 3, soothe: 3, words: 3, place: 1, reasons: 4 } as const;
      for (const f of Object.keys(most) as Array<keyof typeof most>) {
        const ids = o[`${f}Ids`];
        const own = o[`${f}Own`];
        if (ids !== undefined) out[`${f}Ids`] = strArray(ids, { max: most[f], item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (own !== undefined) out[`${f}Own`] = str(own, { max: 80 });
      }
      for (const k of Object.keys(o)) if (!/^(body|hands|soothe|words|place|reasons)(Ids|Own)$/.test(k)) throw new ValidationError('Unexpected field');
      const has = (Object.keys(most) as string[]).some((f) => ((out[`${f}Ids`] as string[] | undefined)?.length ?? 0) > 0 || !!out[`${f}Own`]);
      if (!has) throw new ValidationError('A kit has at least one card');
      return out;
    },
  },
  rebellion_card: {
    // DT-11 part 3 (docs/design/alternate-rebellion.md): a rebellion the person kept on *Keep it in my kit*, which My
    // crisis kit plays as one of its cards (the `rebellionCards` slice). Its own kind, not a section of `crisis_kit`:
    // that one is kept whole from the kit's own screens (keeping it again replaces it), and a rebellion is kept one at a
    // time from Rebel's, so a card added here never rewrites the kit. The function it gives and the rebellion (a
    // curated id, or the person's own words). Never one that lasts: those wait a day and stay out of the kit.
    kind: 'rebellion_card', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: 'rebellionCards',
    owner: 'DT', many: true, maxItems: 12, editor: null, ownFields: ['pickOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      if (o.functionIds !== undefined) out.functionIds = strArray(o.functionIds, { max: 1, item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
      if (o.pickIds !== undefined) {
        out.pickIds = strArray(o.pickIds, { max: 1, item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if ((out.pickIds as string[]).some((id) => (REBELLION_LASTING as readonly string[]).includes(id))) throw new ValidationError('A rebellion that lasts stays out of the kit');
      }
      if (o.pickOwn !== undefined) out.pickOwn = str(o.pickOwn, { max: 90 });
      for (const k of Object.keys(o)) if (!['functionIds', 'pickIds', 'pickOwn'].includes(k)) throw new ValidationError('Unexpected field');
      if (!(out.pickIds as string[] | undefined)?.length && !out.pickOwn) throw new ValidationError('A card holds one rebellion');
      return out;
    },
  },
  safety_plan: {
    // CORE-02 the safety plan (Stanley & Brown; docs/design/safety-route.md): one per person (keeping it again replaces
    // it). Chip ids and own words per step; step 2's crisis kit is referenced (`kit`), never copied. The people to ask
    // and the professionals are one own-words field each (`peopleOwn`, `prosOwn`: a JSON list, so names, numbers and
    // the message are encrypted together). Read through the `safetyPlan` slice (Help & safety, the safety route).
    kind: 'safety_plan', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: 'safetyPlan',
    owner: 'CORE', many: false, maxItems: 1, editor: null,
    ownFields: ['signsOwn', 'copingOwn', 'distractOwn', 'peopleOwn', 'prosOwn', 'saferOwn', 'reasonsOwn', 'hearOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      const most = { signs: 16, coping: 9, distract: 6, safer: 6, reasons: 6 } as const;
      for (const f of Object.keys(most) as Array<keyof typeof most>) {
        if (o[`${f}Ids`] !== undefined) out[`${f}Ids`] = strArray(o[`${f}Ids`], { max: most[f], item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (o[`${f}Own`] !== undefined) out[`${f}Own`] = str(o[`${f}Own`], { max: 200 });
      }
      if (o.hearOwn !== undefined) out.hearOwn = str(o.hearOwn, { max: 200 });
      if (o.kit !== undefined) {
        if (typeof o.kit !== 'boolean') throw new ValidationError('Expected a boolean');
        out.kit = o.kit;
      }
      if (o.peopleOwn !== undefined) out.peopleOwn = JSON.stringify(planContacts(o.peopleOwn, 'people'));
      if (o.prosOwn !== undefined) out.prosOwn = JSON.stringify(planContacts(o.prosOwn, 'pros'));
      for (const k of Object.keys(o)) {
        if (!/^(signs|coping|distract|safer|reasons)(Ids|Own)$/.test(k) && !['hearOwn', 'kit', 'peopleOwn', 'prosOwn'].includes(k)) throw new ValidationError('Unexpected field');
      }
      const has = (Object.keys(most) as string[]).some((f) => ((out[`${f}Ids`] as string[] | undefined)?.length ?? 0) > 0 || !!out[`${f}Own`])
        || !!out.hearOwn || out.kit === true || (out.peopleOwn !== undefined && out.peopleOwn !== '[]') || (out.prosOwn !== undefined && out.prosOwn !== '[]');
      if (!has) throw new ValidationError('A plan has at least one thing in it');
      return out;
    },
  },
  // When it's a habit (DT-09, docs/design/habit-plan.md): the plan the person kept on *Keep it in Me*, for one
  // behaviour (the minimal TargetBehavior until CORE-04 owns one). The runtime's keep (R4: `<field>Ids` / `<field>Own`):
  // the behaviour (`what`), the stretch committed to (`span`, the habit_renew chip), the lapse plan (`lapse`), bridges
  // burned (`burn`), what tends to lead back (`risky`), new bridges (`build`) and what not doing it gives (`reinforce`).
  // The `abstinencePlans` slice reads the behaviour and the lapse plan back for the urge tools' close (part 2); the
  // renewal reopens the visit's own run, and Me lists it.
  abstinence_plan: {
    kind: 'abstinence_plan', label: 'ProfileFact', rel: 'HAS_PROFILE_FACT', area: 'my_plans', slice: 'abstinencePlans',
    owner: 'DT', many: true, maxItems: 6, editor: null,
    ownFields: ['whatOwn', 'lapseOwn', 'burnOwn', 'riskyOwn', 'buildOwn', 'reinforceOwn'],
    validate: (v) => {
      const o = obj(v);
      const out: Record<string, unknown> = {};
      const most = { what: 1, span: 1, lapse: 3, burn: 3, risky: 3, build: 2, reinforce: 3 } as const;
      for (const f of Object.keys(most) as Array<keyof typeof most>) {
        const ids = o[`${f}Ids`];
        const own = o[`${f}Own`];
        if (ids !== undefined) out[`${f}Ids`] = strArray(ids, { max: most[f], item: (x) => str(x, { max: 40, pattern: OPTION_ID }) });
        if (own !== undefined) {
          if (f === 'span') throw new ValidationError('Unexpected field');
          out[`${f}Own`] = str(own, { max: 60 });
        }
      }
      for (const k of Object.keys(o)) if (!/^(what|span|lapse|burn|risky|build|reinforce)(Ids|Own)$/.test(k)) throw new ValidationError('Unexpected field');
      if (!out.whatIds && !out.whatOwn) throw new ValidationError('A plan is for one behaviour');
      if ((out.whatIds as string[] | undefined)?.includes('hurt')) throw new ValidationError('Not a habit plan');
      if (!out.lapseIds && !out.lapseOwn) throw new ValidationError('A plan has its lapse plan');
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

const PHONE = /^[0-9+()\-\s.#*]{0,30}$/;
const PRO_ROLES = ['therapist', 'gp', 'care_team', 'other'] as const;
export interface PlanPerson { name: string; phone: string; text: string }
export interface PlanPro { role: (typeof PRO_ROLES)[number]; name: string; phone: string }

/**
 * The safety plan's people to ask (step 4: name, number, the message they'd send) or professionals (step 5: role,
 * name, number), from a list or its JSON string (the stored form). Empty rows are dropped; the order is the person's.
 */
export function planContacts(v: unknown, which: 'people'): PlanPerson[];
export function planContacts(v: unknown, which: 'pros'): PlanPro[];
export function planContacts(v: unknown, which: 'people' | 'pros'): Array<PlanPerson | PlanPro> {
  let list: unknown = v;
  if (typeof v === 'string') {
    if (v.length > 4000) throw new ValidationError('Too long');
    try { list = JSON.parse(v); } catch { throw new ValidationError('Expected a list'); }
  }
  if (!Array.isArray(list) || list.length > (which === 'people' ? 5 : 3)) throw new ValidationError('Expected a short list');
  const out: Array<PlanPerson | PlanPro> = [];
  for (const row of list) {
    const r = obj(row);
    const name = typeof r.name === 'string' ? str(r.name, { min: 0, max: 40 }).trim() : '';
    const phone = typeof r.phone === 'string' ? str(r.phone, { min: 0, max: 30, pattern: PHONE }).trim() : '';
    if (which === 'people') {
      for (const k of Object.keys(r)) if (!['name', 'phone', 'text'].includes(k)) throw new ValidationError('Unexpected field');
      const text = typeof r.text === 'string' ? str(r.text, { min: 0, max: 160 }).trim() : '';
      if (name || phone) out.push({ name, phone, text });
    } else {
      for (const k of Object.keys(r)) if (!['role', 'name', 'phone'].includes(k)) throw new ValidationError('Unexpected field');
      const role = oneOf(r.role, PRO_ROLES);
      if (name || phone) out.push({ role, name, phone });
    }
  }
  return out;
}
