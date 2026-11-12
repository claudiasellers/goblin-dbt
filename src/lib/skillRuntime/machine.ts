/**
 * The skill runtime's step machine (docs/design/skill-runtime.md, "The run"). Pure: any skill from
 * skills.json, one state, events in, state out. The player (src/components/skillPlayer/) renders it and
 * owns everything that is saved; `runRecord` is what the visit's ToolSession carries as `ext.run`.
 *
 * Rules every skill gets: picks past `max` swap out the oldest (`swap`) or are ignored; a pick that its
 * field's filter or group no longer offers is dropped; answers of fields hidden by `showWhen` are dropped
 * when the step is left; `next` follows the first transition that holds; nothing is pre-filled from a past run.
 * A whole-screen embed step ends with `embedDone`: only what its EMBED_OUTPUTS entry declares is kept; its option
 * ids become the `answerAs` answer (ids only: own words are kept once, in `out`), its measurements and own words
 * the run's `out`, and the run goes on. Context in (`$ctx.*`) is only what the skill `accepts`, ids only; `band`
 * only one of the three bands, and never from a link (the player strips it from the query: R1, C4.6).
 * Planned exits (tools not built yet) are never offered or linked.
 * F2: profile slices (`$p.*`, a field's `profile` options: the person's kept items first, never selected), a
 * step's keep and follow-up actions (the player runs them on the primary tap, the run records `kept` /
 * `scheduled`), inline runs (`initialRun(skill, enterAt)`, `inlineResult`) and resume (`resumeRun`).
 */
import type { CrisisSlot, EmbedOutput, EmbedOutputSchema, ExitDef, FollowUpAction, KeepAction, FieldDef, OptionDef, SkillDef, SkillsContent, StepDef } from '../../data/skillTypes';
import { holds, profileItemId, resolve, type Answer, type Answers, type Scope } from './conditions';

export type { Answer, Answers } from './conditions';

export interface RunContext {
  skill: SkillDef;
  /** The shared tables (skills.json `parentOf`, `fitsWhen`). */
  shared: Pick<SkillsContent, 'parentOf' | 'fitsWhen'>;
  /** Emotions a link or hand-off carried in (grid ids): first on an emotion field, never pre-selected. */
  carried: string[];
  /** Every grid word id (an emotion pick must be one). */
  gridIds: ReadonlySet<string>;
  /** A grid word as the grid shows it, lower-case ("let down"). */
  emotionLabel: (id: string) => string;
  /** Context in (`$ctx.*`), already narrowed by `contextIn` to the keys the skill accepts. */
  ctxIn?: Readonly<Record<string, string>>;
  /** What each embed may report (embeds.ts EMBED_OUTPUTS). An embed with no entry reports nothing. */
  embedOutputs?: Readonly<Record<string, EmbedOutputSchema>>;
  /** The tool's profile slices (PROFILE_NEEDS), or null while loading / signed out (`$p.*` reads absent). */
  profile?: Readonly<Record<string, unknown>> | null;
  /**
   * Tools that write nothing until the person saves (R15, `deferSession` in src/data/tools.ts: Ending a
   * relationship). An exit to one is recorded as `private`, never by its id, in this run's own record, so a kept
   * host run doesn't show where the person went.
   */
  privateTools?: ReadonlySet<string>;
}

/** The record's id for an exit to a persist-nothing tool (RunContext.privateTools). */
export const PRIVATE_EXIT = 'private';

/** One whole-screen embed's report, as the run keeps it (and `ext.run.out` records it). */
export interface EmbedRecord extends EmbedOutput { embed: string; stepId: string }

export interface RunState {
  stepId: string;
  /** Step ids in the order shown (a step shown again after Back appears again). */
  path: string[];
  answers: Answers;
  /** Slot records that showed (e.g. `unblend`). */
  shown: string[];
  /** What the hand-off offered when it was reached. */
  offered: string[];
  exitId: string | null;
  /** Whole-screen embeds' reports, by step id. */
  out: Record<string, EmbedRecord>;
  /** Profile items this run kept, by step (the id is reused if the step is passed again). */
  kept: Record<string, { kind: string; id: string }>;
  /** Follow-ups this run scheduled, by step. */
  scheduled: Record<string, { type: string; id: string }>;
}

export type RunEvent =
  | { type: 'pick'; fieldId: string; value: string }
  | { type: 'own'; fieldId: string; text: string }
  | { type: 'shown'; record: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'exit'; exitId: string }
  | { type: 'embedDone'; output: EmbedOutput }
  /** The player kept the step's item / scheduled its follow-up (after the server said yes). */
  | { type: 'kept'; stepId: string; kind: string; id: string }
  | { type: 'scheduled'; stepId: string; followUpType: string; id: string };

export interface OptionGroup {
  /** The pick this group belongs to (`groupBy`), `$own` for own words, or null when ungrouped. */
  key: string | null;
  /** The group's heading: the pick's label, or the person's own words. */
  label: string | null;
  own: boolean;
  options: OptionDef[];
}

const PATH_MAX = 48;
const ID = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;
/**
 * Context keys that are recorded. `returnTo` is a path: it steers, it isn't kept. `band` is ask-fresh: it may
 * steer this run (carried by `band.current()`), but it is never recorded or carried on (C4.6).
 */
const RECORDED_CTX = ['urgeId', 'personId', 'frame', 'enterAt', 'situationId', 'partId'] as const;
const BAND_VALUES = new Set(['steady', 'stirred', 'flooded']);
const EMPTY: Answer = { ids: [], own: null };

/** A fresh run, at the skill's start, or (inline, R8) at one of the steps it declares it can start at. */
export function initialRun(skill: SkillDef, enterAt?: string | null): RunState {
  const at = enterAt && skill.inline?.enterAt.includes(enterAt) ? enterAt : skill.start;
  return { stepId: at, path: [at], answers: {}, shown: [], offered: [], exitId: null, out: {}, kept: {}, scheduled: {} };
}

/**
 * The context a page passes in (query and route state), narrowed to what the skill accepts. Every value must be
 * an id; `returnTo` must be an in-app path. Anything else is dropped, never guessed.
 */
export function contextIn(skill: SkillDef, raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of skill.accepts ?? []) {
    const v = raw[key];
    if (typeof v !== 'string') continue;
    const ok = key === 'returnTo' ? /^\/[A-Za-z0-9/_?=&.-]{0,200}$/.test(v) && !v.startsWith('//')
      : key === 'band' ? BAND_VALUES.has(v)
        : ID.test(v);
    if (ok) out[key] = v;
  }
  return out;
}

const plannedExit = (ctx: RunContext, id: string) => !!ctx.skill.exits.find((x) => x.id === id)?.planned;

export const stepOf = (skill: SkillDef, id: string): StepDef => {
  const s = skill.steps.find((x) => x.id === id);
  if (!s) throw new Error(`skill ${skill.id}: no step ${id}`);
  return s;
};

const allFields = (skill: SkillDef): FieldDef[] => skill.steps.flatMap((s) => s.fields ?? []);
const fieldOf = (skill: SkillDef, id: string): FieldDef | undefined => allFields(skill).find((f) => f.id === id);

function table(ctx: RunContext, name: string): Record<string, unknown> | undefined {
  if (name === 'parentOf') return ctx.shared.parentOf;
  if (name === 'fitsWhen') return ctx.shared.fitsWhen;
  return ctx.skill.tables[name];
}

/** The skill's derived values (lookups through tables), in order: a later one may read an earlier one. */
export function derive(ctx: RunContext, answers: Answers): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const d of ctx.skill.derive) {
    const t = table(ctx, d.table);
    if (d.kind === 'count') {
      out[d.name] = countRow(t, countPicks(d, answers)) ?? d.default ?? null;
      continue;
    }
    const v = resolve(d.from, scopeOf(ctx, answers, out));
    if (typeof v === 'string' && t && Object.hasOwn(t, v)) out[d.name] = d.keep === 'key' ? v : t[v];
    else out[d.name] = d.default ?? null;
  }
  return out;
}

/** A counting derive's total: every pick of its fields, weighted by option value (1 each when it has no weights). */
export function countPicks(d: Pick<SkillDef['derive'][number], 'fields' | 'weights'>, answers: Answers): number {
  let total = 0;
  for (const f of d.fields ?? []) {
    for (const v of answers[f]?.ids ?? []) total += d.weights ? d.weights[v] ?? 0 : 1;
  }
  return total;
}

/** The row of a threshold table (numeric keys) with the largest key at or below the total. */
function countRow(t: Record<string, unknown> | undefined, total: number): unknown {
  if (!t) return undefined;
  let best: number | null = null;
  for (const k of Object.keys(t)) {
    const n = Number(k);
    if (Number.isFinite(n) && n <= total && (best === null || n > best)) best = n;
  }
  return best === null ? undefined : t[String(best)];
}

function scopeOf(ctx: RunContext, answers: Answers, derived: Record<string, unknown>): Scope {
  return {
    answers,
    derived,
    ctx: ctx.ctxIn ?? {},
    profile: ctx.profile ?? null,
    picked: (fieldId) => {
      const f = fieldOf(ctx.skill, fieldId);
      const list = f?.options.list ? ctx.skill.options[f.options.list] ?? [] : [];
      const ids = answers[fieldId]?.ids ?? [];
      return list.filter((o) => ids.includes(o.value));
    },
  };
}

/** The scope conditions are evaluated in for this state. */
export function scope(ctx: RunContext, s: Pick<RunState, 'answers'>): Scope {
  return scopeOf(ctx, s.answers, derive(ctx, s.answers));
}

/**
 * The emotion words a field offers: carried first, then its own list (`emotionsFrom`'s derived list when it
 * resolves to one, else `emotions`), then any pick from the full list.
 */
export function emotionChoices(ctx: RunContext, field: FieldDef, answers: Answers): string[] {
  const from = field.options.emotionsFrom ? resolve(field.options.emotionsFrom, scope(ctx, { answers })) : null;
  const derived = Array.isArray(from) ? from.filter((x): x is string => typeof x === 'string') : [];
  const own = derived.length ? derived : field.options.emotions ?? [];
  const carried = field.options.carriedFirst ? ctx.carried.filter((id) => ctx.gridIds.has(id)) : [];
  const picked = answers[field.id]?.ids ?? [];
  return [...new Set([...carried, ...own, ...picked])];
}

/** A list field's chips, grouped (alternatives per story) or as one group. */
export function optionGroups(ctx: RunContext, field: FieldDef, answers: Answers, sc: Scope = scope(ctx, { answers })): OptionGroup[] {
  const src = field.options;
  if (!src.list && !src.profile) return [];
  const mine = src.profile ? profileOptions(ctx, src.profile) : [];
  let list = [...mine, ...(src.list ? ctx.skill.options[src.list] ?? [] : []).filter((opt) => holds(src.where, { ...sc, opt }))];
  const first = src.firstFrom ? resolve(src.firstFrom, sc) : null;
  if (typeof first === 'string' && list.some((o) => o.value === first)) {
    list = [...list.filter((o) => o.value === first), ...list.filter((o) => o.value !== first)];
  }
  if (!src.groupBy) return [{ key: null, label: null, own: false, options: list }];
  const by = fieldOf(ctx.skill, src.groupBy);
  const parents = by?.options.list ? ctx.skill.options[by.options.list] ?? [] : [];
  const a = answers[src.groupBy] ?? EMPTY;
  const groups: OptionGroup[] = a.ids.map((id) => ({
    key: id, label: parents.find((p) => p.value === id)?.label ?? null, own: false, options: list.filter((o) => o.for === id),
  }));
  if (a.own) groups.push({ key: '$own', label: a.own, own: true, options: list.filter((o) => o.for === '$own') });
  return groups.filter((g) => g.options.length > 0);
}

/**
 * A profile slice's items as options (R3): value the item id, label what the person kept (a part's name, a
 * line's text, a person's name). An item with nothing to call it uses the skill's `profile_unnamed` copy, or
 * is left out. Labels are shown, never recorded: the pick is the id.
 */
export function profileOptions(ctx: RunContext, slice: string): OptionDef[] {
  const items = ctx.profile?.[slice];
  if (!Array.isArray(items)) return [];
  const fallback = ctx.skill.copy.profile_unnamed ?? null;
  return items.flatMap((it) => {
    const id = profileItemId(it);
    const o = it as { name?: unknown; text?: unknown; label?: unknown };
    const label = [o.name, o.text, o.label].find((x): x is string => typeof x === 'string' && x.trim() !== '') ?? fallback;
    return id && ID.test(id) && label ? [{ value: id, label, mine: true }] : [];
  });
}

/** Every value a field may hold right now. */
function validValues(ctx: RunContext, field: FieldDef, answers: Answers, sc: Scope): Set<string> | null {
  if (field.options.emotions) return null; // any grid word (checked at the pick)
  return new Set(optionGroups(ctx, field, answers, sc).flatMap((g) => g.options.map((o) => o.value)));
}

/** The answers without these fields' (a step's `clears`). */
function without(answers: Answers, fields: string[]): Answers {
  const next = { ...answers };
  for (const f of fields) delete next[f];
  return next;
}

/** Drop picks a field no longer offers (a filter or group changed). Repeats until nothing changes. */
function normalize(ctx: RunContext, answers: Answers): Answers {
  let cur = answers;
  for (let i = 0; i < 4; i++) {
    const sc = scope(ctx, { answers: cur });
    let changed = false;
    const next: Answers = { ...cur };
    for (const f of allFields(ctx.skill)) {
      const a = cur[f.id];
      if (!a || !a.ids.length) continue;
      const valid = validValues(ctx, f, cur, sc);
      if (!valid) continue;
      const ids = a.ids.filter((v) => valid.has(v));
      if (ids.length !== a.ids.length) {
        const kept = a.own ? { ownAt: a.ids.slice(0, ownAt(a)).filter((v) => valid.has(v)).length } : {};
        next[f.id] = { ...a, ids, ...kept }; changed = true;
      }
    }
    if (!changed) return cur;
    cur = next;
  }
  return cur;
}

const count = (f: FieldDef, a: Answer) => a.ids.length + (f.own?.countsAsPick && a.own ? 1 : 0);

/** Where the own words sit among the picks, by when they were given: the number of picks older than them. */
const ownAt = (a: Answer) => Math.min(a.ownAt ?? a.ids.length, a.ids.length);

/** The answer without its oldest pick (own words count when they are a pick: the two-story swap). */
function dropOldest(f: FieldDef, a: Answer): Answer {
  if (a.own && f.own?.countsAsPick && ownAt(a) === 0) return { ids: a.ids, own: null };
  if (!a.ids.length) return a;
  return { ...a, ids: a.ids.slice(1), ...(a.own ? { ownAt: Math.max(0, ownAt(a) - 1) } : {}) };
}

/** A seed field's starter (`own.seed`): the option whose words the box still holds unchanged, or null. */
export function seededFrom(ctx: RunContext, f: FieldDef, a: Answer | undefined): string | null {
  if (!f.own?.seed || !a?.own || !f.options.list) return null;
  return (ctx.skill.options[f.options.list] ?? []).find((o) => o.label === a.own)?.value ?? null;
}

function pick(ctx: RunContext, f: FieldDef, a: Answer, value: string): Answer {
  if (f.own?.seed) {
    // A starter: its words go into the box to change. Never over words the person wrote (the chips are hidden
    // then; this holds even if a tap arrives); the same chip again empties the box.
    const label = (f.options.list ? ctx.skill.options[f.options.list] ?? [] : []).find((o) => o.value === value)?.label;
    if (!label || (a.own && seededFrom(ctx, f, a) === null)) return a;
    return a.own === label ? { ids: [], own: null } : { ids: [], own: label.slice(0, ownMaxOf(ctx, f)) };
  }
  const i = a.ids.indexOf(value);
  if (i >= 0) return { ...a, ids: a.ids.filter((v) => v !== value), ...(a.own && i < ownAt(a) ? { ownAt: ownAt(a) - 1 } : {}) };
  if (f.options.emotions && !ctx.gridIds.has(value)) return a;
  if (count(f, a) < f.max) return { ...a, ids: [...a.ids, value] };
  if (f.max === 1) return f.own?.countsAsPick ? { ids: [value], own: null } : { ...a, ids: [value] };
  if (!f.swap) return a;
  const d = dropOldest(f, a);
  return { ...d, ids: [...d.ids, value] };
}

function own(ctx: RunContext, f: FieldDef, a: Answer, raw: string): Answer {
  if (!f.own) return a;
  const text = raw.slice(0, ownMaxOf(ctx, f));
  if (!text.trim()) { const { ownAt: _gone, ...rest } = a; void _gone; return { ...rest, own: null }; }
  if (a.own) return { ...a, own: text };
  if (!f.own.countsAsPick || count(f, a) < f.max) return { ...a, own: text, ownAt: a.ids.length };
  if (f.max === 1) return { ids: [], own: text };
  if (!f.swap) return a;
  const d = dropOldest(f, a);
  return { ids: d.ids, own: text, ownAt: d.ids.length };
}

/** A field's own-words cap: its own `max`, never above the skill's. */
export const ownMaxOf = (ctx: RunContext, f: FieldDef): number => Math.min(f.own?.max ?? ctx.skill.ownMax, ctx.skill.ownMax);

/** The fields a step shows right now. */
export function shownFields(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>, sc: Scope = scope(ctx, s)): FieldDef[] {
  return (step.fields ?? []).filter((f) => holds(f.showWhen, sc));
}

/** Whether Next is open: every shown required field has an answer. */
export function canGoOn(ctx: RunContext, s: RunState): boolean {
  const step = stepOf(ctx.skill, s.stepId);
  return shownFields(ctx, step, s).every((f) => !f.required || count({ ...f, own: f.own && { ...f.own, countsAsPick: true } }, s.answers[f.id] ?? EMPTY) > 0);
}

/** The exits a hand-off step offers for these answers, in order, each once. */
export function offersFor(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>): string[] {
  const sc = scope(ctx, s);
  return [...new Set(step.offers.filter((o) => holds(o.when, sc) && !plannedExit(ctx, o.exit)).map((o) => o.exit))];
}

export function runNext(ctx: RunContext, s: RunState, e: RunEvent): RunState {
  switch (e.type) {
    case 'pick':
    case 'own': {
      const f = fieldOf(ctx.skill, e.fieldId);
      if (!f) return s;
      const a = s.answers[f.id] ?? EMPTY;
      const nextA = e.type === 'pick' ? pick(ctx, f, a, e.value) : own(ctx, f, a, e.text);
      if (nextA === a) return s;
      return { ...s, answers: normalize(ctx, { ...s.answers, [f.id]: nextA }) };
    }
    case 'shown':
      return s.shown.includes(e.record) ? s : { ...s, shown: [...s.shown, e.record] };
    case 'embedDone': {
      const step = stepOf(ctx.skill, s.stepId);
      if (step.kind !== 'embed' || !step.embed) return s;
      const o = e.output;
      const decl = ctx.embedOutputs?.[step.embed] ?? {};
      const allowed = new Set(decl.ids ?? []);
      const ids = (o.ids ?? []).filter((v) => typeof v === 'string' && ID.test(v) && allowed.has(v)).slice(0, 12);
      const own = decl.ownText && typeof o.own === 'string' && o.own.trim() ? o.own.trim().slice(0, ctx.skill.ownMax) : null;
      const measures = new Set(decl.measures ?? []);
      const n = (k: 'durationSec' | 'doneCount' | 'earlyCount', max: number) => {
        const v = o[k];
        return measures.has(k) && typeof v === 'number' && Number.isInteger(v) && v >= 0 ? Math.min(v, max) : undefined;
      };
      const rec: EmbedRecord = {
        embed: step.embed, stepId: step.id, ids, own,
        durationSec: n('durationSec', 3600), doneCount: n('doneCount', 100), earlyCount: n('earlyCount', 100),
      };
      const answers = step.answerAs ? { ...s.answers, [step.answerAs]: { ids, own: null } } : s.answers;
      return runNext(ctx, { ...s, answers, out: { ...s.out, [step.id]: rec } }, { type: 'next' });
    }
    case 'kept': {
      const step = ctx.skill.steps.find((x) => x.id === e.stepId);
      if (!step?.keep || step.keep.kind !== e.kind || !ID.test(e.id)) return s;
      return { ...s, kept: { ...s.kept, [e.stepId]: { kind: e.kind, id: e.id } } };
    }
    case 'scheduled': {
      const step = ctx.skill.steps.find((x) => x.id === e.stepId);
      if (!step?.followUp || step.followUp.type !== e.followUpType || !ID.test(e.id)) return s;
      return { ...s, scheduled: { ...s.scheduled, [e.stepId]: { type: e.followUpType, id: e.id } } };
    }
    case 'next': {
      if (!canGoOn(ctx, s)) return s;
      const step = stepOf(ctx.skill, s.stepId);
      const sc = scope(ctx, s);
      const visible = new Set(shownFields(ctx, step, s, sc).map((f) => f.id));
      const answers = { ...s.answers };
      for (const f of step.fields ?? []) if (!visible.has(f.id)) delete answers[f.id];
      const after = { ...s, answers: normalize(ctx, answers) };
      const t = step.next.find((x) => holds(x.when, scope(ctx, after)));
      if (!t) return s;
      const to = stepOf(ctx.skill, t.to);
      const arrived = to.clears?.length ? { ...after, answers: normalize(ctx, without(after.answers, to.clears)) } : after;
      return {
        ...arrived, stepId: to.id, path: [...arrived.path, to.id].slice(-PATH_MAX),
        offered: to.kind === 'handoff' ? offersFor(ctx, to, arrived) : arrived.offered,
      };
    }
    case 'back': {
      const i = s.path.lastIndexOf(s.stepId);
      const prev = i > 0 ? s.path[i - 1] : null;
      if (!prev || prev === s.stepId) return s;
      return { ...s, stepId: prev, path: [...s.path, prev].slice(-PATH_MAX), offered: [] };
    }
    case 'exit':
      return ctx.skill.exits.some((x) => x.id === e.exitId && !x.planned && !x.safety) ? { ...s, exitId: e.exitId } : s;
  }
}

/**
 * What the current step keeps on its primary tap (R4), or null: no keep, its `when` doesn't hold, or nothing to
 * keep. `id` is the item this run already kept from this step (passed again, the same item is kept again).
 */
export function keepFor(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers' | 'kept' | 'path' | 'stepId'>): { kind: string; value: Record<string, unknown>; id: string | null } | null {
  const k: KeepAction | undefined = step.keep;
  if (!k || !holds(k.when, scope(ctx, s))) return null;
  if (persistence(ctx, s) !== 'save') return null;
  const value: Record<string, unknown> = {};
  for (const f of k.from) {
    const a = s.answers[f];
    if (a?.ids.length) value[`${f}Ids`] = a.ids;
    if (a?.own?.trim()) value[`${f}Own`] = a.own.trim();
  }
  if (!Object.keys(value).length) return null;
  return { kind: k.kind, value, id: s.kept[step.id]?.id ?? null };
}

/**
 * Persist-nothing (R15): whether this visit may write anything yet. `save`: a normal visit (the session starts, or
 * has). `wait`: not yet decided (the run hasn't left the skill's `persist.after` step): nothing is started.
 * `nothing`: `persist.nothingWhen` holds: nothing is written, and a session already begun closes bare. A skill
 * with no `persist` is always `save`.
 */
export type Persistence = 'save' | 'wait' | 'nothing';
export function persistence(ctx: RunContext, s: Pick<RunState, 'answers' | 'path' | 'stepId'>): Persistence {
  const p = ctx.skill.persist;
  if (!p) return 'save';
  const left = s.path.includes(p.after) && s.stepId !== p.after;
  if (!left) return 'wait';
  return holds(p.nothingWhen, scope(ctx, s)) ? 'nothing' : 'save';
}

/** What the current step schedules on its primary tap (R5): the type and the chip picked, or null. */
export function followUpFor(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers' | 'scheduled' | 'path' | 'stepId'>): { type: string; chip: string | null } | null {
  const f: FollowUpAction | undefined = step.followUp;
  if (!f || s.scheduled[step.id] || !holds(f.when, scope(ctx, s))) return null;
  // Persist-nothing (R15): a run that writes nothing schedules nothing.
  if (persistence(ctx, s) !== 'save') return null;
  if (!f.whenFrom) return { type: f.type, chip: null };
  const chip = s.answers[f.whenFrom]?.ids[0] ?? f.whenDefault;
  return chip ? { type: f.type, chip } : null;
}

/**
 * An inline run's result for its host (R8): each `returns` field's answer, and the then-vs-now its change check
 * gave (written as the sub-run's close). Null when the skill isn't inline.
 */
export function inlineResult(ctx: RunContext, s: Pick<RunState, 'answers'>): { answers: Record<string, Answer>; thenVsNow: string | null } | null {
  const inl = ctx.skill.inline;
  if (!inl) return null;
  const answers = Object.fromEntries(inl.returns.filter((f) => s.answers[f]).map((f) => [f, s.answers[f]]));
  const tvn = inl.thenVsNowFrom ? s.answers[inl.thenVsNowFrom]?.ids[0] ?? null : null;
  return { answers, thenVsNow: tvn };
}

/**
 * Resume (R9): a run reopened from its own record (`ext.run`, the same visit's answers read back, so not a
 * pre-fill from memory), at `at` if the record's path went through it. Ask-fresh fields are never restored:
 * they are asked again, so the run reopens no later than the first step on its path that asks one (what comes
 * after it may hang on that answer), and only the steps up to the one reopened bring their answers back (a later
 * step is asked again, never pre-filled); a `reopens` step, which only a reopened run starts on, comes after the
 * whole recorded path of a run that reached its `after` step and brings every answer back but the ask-fresh ones
 * (null for a run that didn't get that far; a run reopened a second time, the step on its path already, still comes back after its whole path, and the step's `clears` drop its last loop's answers); a field that books a reminder (`followUp.whenFrom`) is never read back. A hand-off reopened works out its offers again. Null when the record isn't
 * this skill's version or `at` isn't a step it reached. `keepFresh` is for the review page only (dev/
 * skills-review.tsx, which shows every step from a made-up run); the app never passes it.
 */
export function resumeRun(ctx: RunContext, rec: unknown, at: string | null, { keepFresh = false }: { keepFresh?: boolean } = {}): RunState | null {
  if (!rec || typeof rec !== 'object') return null;
  const r = rec as { skillId?: unknown; versionId?: unknown; path?: unknown; answers?: unknown };
  if (r.skillId !== ctx.skill.id || r.versionId !== ctx.skill.version || !Array.isArray(r.path)) return null;
  const path = (r.path as unknown[]).filter((x): x is string => typeof x === 'string' && ctx.skill.steps.some((st) => st.id === x));
  // A `reopens` step (a step only a reopened run starts on, never reached on a first visit, e.g. Problem Solve's
  // *How did it go?*) comes after the whole recorded path, so every answer of that run comes back.
  // It holds only for a run that got as far as its `after` step (the plan it asks about); any other run has nothing to
  // ask about and doesn't reopen (null: a whole first visit). Its ask-fresh answers stay unread, and there is no
  // detour back to the step that asked one: the person tapped *How did it go?*, not the middle of the plan (build.py
  // keeps the reopens step and everything after it from reading an ask-fresh field).
  // A run reopened a second time has the step on its path already (its last review, then a new plan): it still comes
  // after the whole path, so the new plan's answers come back, and the step's `clears` drop its last loop's answers.
  const reopensAt = at ? ctx.skill.steps.find((st) => st.id === at && st.reopens) : undefined;
  // The latest loop decides: the plan must stand after the last time the step was asked, made again at `after` or
  // kept by one of the `again` steps (a reminder booked again on *Not yet*). A run whose last review led to a revised
  // plan that was left half-made has nothing to ask about, so it doesn't reopen.
  const standsAt = reopensAt ? Math.max(...[reopensAt.reopens!.after, ...(reopensAt.reopens!.again ?? [])].map((x) => path.lastIndexOf(x))) : -1;
  if (reopensAt && standsAt <= path.lastIndexOf(reopensAt.id)) return null;
  const reopened = !!reopensAt;
  // A step the skill names as a re-entry point (`resumeAt`: a check-in days later) opens even off the run's path.
  const reentry = !reopened && !!at && !path.includes(at) && !!ctx.skill.resumeAt?.includes(at) && ctx.skill.steps.some((st) => st.id === at);
  let stepId = reopensAt?.id ?? (at && (path.includes(at) || reentry) ? at : path[path.length - 1]);
  if (!stepId) return null;
  const fresh = new Set(keepFresh ? [] : allFields(ctx.skill).filter((f) => f.askFresh).map((f) => f.id));
  // A re-entry step opened by its check-in asks again: its own answers from an earlier check-in are never restored.
  if (at && stepId === at && ctx.skill.resumeAt?.includes(at)) for (const f of stepOf(ctx.skill, at).fields ?? []) fresh.add(f.id);
  const asksFresh = path.findIndex((id) => (stepOf(ctx.skill, id).fields ?? []).some((f) => fresh.has(f.id)));
  if (!reopened && asksFresh >= 0 && asksFresh < path.lastIndexOf(stepId)) stepId = path[asksFresh];
  // Reopened: the path up to where the plan was last made, so earlier review loops (whose answers the step clears)
  // don't pile up, and the newest steps are the ones kept.
  // A re-entry step opened off the path is reached from the run's last step.
  const upTo = reopened ? path.slice(0, Math.max(path.lastIndexOf(reopensAt!.reopens!.after), 0) + 1)
    : reentry && stepId === at ? [...path, at] : path.slice(0, path.lastIndexOf(stepId) + 1);
  // A step after the resume point will be asked again, and an answer read back there would be a pre-fill (a reminder
  // chip picked last time would schedule again unasked).
  const fieldsOf = (id: string) => {
    const st = stepOf(ctx.skill, id);
    return [...(st.fields ?? []).map((f) => f.id), ...(st.answerAs ? [st.answerAs] : [])];
  };
  // Dropped: only the fields of steps the path reached after the resume point and nowhere at or before it (they are
  // asked again). A step that fell off the front of the capped path still brings its answers back (the feeling, the
  // problem, a danger answer and its banner). Reopened, nothing on the path is after the step.
  const before = new Set(upTo.flatMap(fieldsOf));
  const after = new Set(reopened ? [] : path.slice(upTo.length).flatMap(fieldsOf).filter((f) => !before.has(f)));
  const onPath = new Set(ctx.skill.steps.flatMap((st) => fieldsOf(st.id)).filter((f) => !after.has(f)));
  // A reminder's own chip (a followUp's `whenFrom` on the step that books it) is always a fresh tap: read back, it
  // would book again unasked. A `whenFrom` naming an earlier step's field (Cope Ahead's *When is it?*) is a real
  // answer and comes back like any other; the step that books from it stays a fresh Next unless it already booked.
  const books = new Set(ctx.skill.steps.flatMap((st) =>
    st.followUp?.whenFrom && (st.fields ?? []).some((f) => f.id === st.followUp!.whenFrom) ? [st.followUp.whenFrom] : []));
  // Steps before the resume point that booked their follow-up (the record's `scheduled` types) stay booked, so
  // going on from there (or Back into one) never books a second one. The resume step itself and every step after
  // it are unbooked. A reopened run is a new round: its reminder was the one that reopened it, so nothing is restored.
  const bookedTypes = new Set(Array.isArray((rec as { scheduled?: unknown }).scheduled)
    ? ((rec as { scheduled: unknown[] }).scheduled).filter((x): x is string => typeof x === 'string') : []);
  const scheduled: RunState['scheduled'] = {};
  for (const id of reopened ? [] : upTo.slice(0, -1)) {
    const f = stepOf(ctx.skill, id).followUp;
    if (f && id !== stepId && bookedTypes.has(f.type)) scheduled[id] = { type: f.type, id: '' };
  }
  const answers: Answers = {};
  for (const a of Array.isArray(r.answers) ? r.answers as Array<Record<string, unknown>> : []) {
    const fieldId = a.fieldId;
    if (typeof fieldId !== 'string' || fresh.has(fieldId) || !onPath.has(fieldId) || books.has(fieldId) || !fieldOf(ctx.skill, fieldId)) continue;
    const ids = Array.isArray(a.optionIds) ? (a.optionIds as unknown[]).filter((x): x is string => typeof x === 'string' && ID.test(x)) : [];
    const own = typeof a.valueOwn === 'string' && a.valueOwn.trim() ? a.valueOwn : null;
    answers[fieldId] = { ids, own };
  }
  const step = stepOf(ctx.skill, stepId);
  const kept = normalize(ctx, reopened && step.clears?.length ? without(answers, step.clears) : answers);
  return {
    ...initialRun(ctx.skill), stepId, path: (reopened ? [...upTo, stepId] : upTo).slice(-PATH_MAX), answers: kept, scheduled,
    offered: step.kind === 'handoff' ? offersFor(ctx, step, { answers: kept }) : [],
  };
}

/**
 * The context a page run goes on with once its resume is settled (R9): a link's `enterAt` names where the run it
 * reopens picks up, so it holds only when that run reopened. When it didn't (too old, another version, a failed
 * read), the fresh run starts without it and is a whole first visit, never one that thinks it was reopened.
 */
export function ctxAfterResume(ctxIn: Readonly<Record<string, string>>, reopened: boolean): Readonly<Record<string, string>> {
  if (reopened || !('enterAt' in ctxIn)) return ctxIn;
  return Object.fromEntries(Object.entries(ctxIn).filter(([k]) => k !== 'enterAt'));
}

/** A copy ref's text: a key, or the first conditional key that holds. Slots `{name}` filled from `slots`. */
export function copyText(ctx: RunContext, ref: StepDef['title'], s: Pick<RunState, 'answers'>, slots: Record<string, string> = {}): string | null {
  if (!ref) return null;
  const sc = scope(ctx, s);
  const key = typeof ref === 'string' ? ref : ref.find((r) => holds(r.when, sc))?.key;
  const text = key ? ctx.skill.copy[key] ?? null : null;
  return text ? text.replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m) : null;
}

/** A step's title slots: `{labelOf: field}` is that field's first pick, as the person sees it. */
export function titleSlots(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, src] of Object.entries(step.titleSlots ?? {})) {
    const f = fieldOf(ctx.skill, src.labelOf);
    const a = s.answers[src.labelOf];
    // The person's own words, when the field has them, are what they said (a starter they changed included).
    if (f && a?.own?.trim()) { out[name] = a.own.trim(); continue; }
    const v = a?.ids[0];
    if (!f || !v) continue;
    out[name] = f.options.emotions ? ctx.emotionLabel(v) : (ctx.skill.options[f.options.list ?? '']?.find((o) => o.value === v)?.label ?? v);
  }
  return out;
}

/** The hand-off line: the first of the step's lines that holds. */
export function handoffLine(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>): string | null {
  const sc = scope(ctx, s);
  const key = step.lines?.find((l) => holds(l.when, sc))?.key;
  return key ? ctx.skill.copy[key] ?? null : null;
}

/** The list a field shows above its chips (e.g. the parent's fitsTheFactsWhen), or null. */
export function fieldList(ctx: RunContext, field: FieldDef, s: Pick<RunState, 'answers'>): string[] | null {
  if (!field.list) return null;
  const key = scope(ctx, s).derived[field.list.key.replace(/^\$d\./, '')];
  const row = typeof key === 'string' ? table(ctx, field.list.table)?.[key] : undefined;
  const lines = (row as { lines?: unknown } | undefined)?.lines;
  return Array.isArray(lines) && lines.length ? (lines as string[]) : null;
}

/** The quiet links under a field that hold now. */
export function fieldLinks(ctx: RunContext, field: FieldDef, s: Pick<RunState, 'answers'>): Array<{ exit: ExitDef; label: string }> {
  return linksThatHold(ctx, field.links, s);
}

/** The quiet links under an embed or hand-off screen that hold now (an ask step's are on its fields). */
export function stepLinks(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>): Array<{ exit: ExitDef; label: string }> {
  return step.kind === 'ask' ? [] : linksThatHold(ctx, step.links, s);
}

function linksThatHold(ctx: RunContext, links: FieldDef['links'], s: Pick<RunState, 'answers'>): Array<{ exit: ExitDef; label: string }> {
  const sc = scope(ctx, s);
  return (links ?? []).filter((l) => holds(l.when, sc)).flatMap((l) => {
    const exit = ctx.skill.exits.find((x) => x.id === l.exit && !x.planned);
    return exit ? [{ exit, label: ctx.skill.copy[l.label] ?? l.label }] : [];
  });
}

/**
 * The run's answers as the person saw them, for an embed to read back (`EmbedProps.picked`): each answered
 * field's labels in pick order (grid words as the grid shows them, list options by their label), own words last.
 */
export function pickedLabels(ctx: RunContext, s: Pick<RunState, 'answers'>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [fieldId, a] of Object.entries(s.answers)) {
    const f = fieldOf(ctx.skill, fieldId);
    const list = f?.options.list ? ctx.skill.options[f.options.list] ?? [] : [];
    const labels = a.ids.map((id) => (f?.options.emotions ? ctx.emotionLabel(id) : list.find((o) => o.value === id)?.label ?? id));
    if (a.own?.trim()) labels.push(a.own.trim());
    if (labels.length) out[fieldId] = labels;
  }
  return out;
}

/** The emotions this run names (the skill's `emotionFields`): the session's `setEmotionIds`. */
export function runEmotionIds(ctx: RunContext, s: Pick<RunState, 'answers'>): string[] {
  return ctx.skill.emotionFields.flatMap((f) => s.answers[f]?.ids ?? []);
}

/**
 * The urges this run names (the spine's ask-fresh `urgeIds`): each picked option's `urge` prop (an ActionUrge id),
 * in pick order. Own words name none.
 */
export function runUrgeIds(ctx: RunContext, s: Pick<RunState, 'answers'>): string[] {
  const out: string[] = [];
  for (const f of allFields(ctx.skill)) {
    const list = f.options.list;
    if (!list) continue;
    for (const id of s.answers[f.id]?.ids ?? []) {
      const u = ctx.skill.options[list]?.find((o) => o.value === id)?.urge;
      if (typeof u === 'string' && ID.test(u) && !out.includes(u)) out.push(u);
    }
  }
  return out;
}

/** Whether safety.open opens over this step as the run arrives at it (`safetyFirst`, plan C6.5). */
export function opensSafety(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>): boolean {
  return !!step.safetyFirst && holds(step.safetyFirst, scope(ctx, s));
}

/** The crisis slot a step shows right now (variant), or null. */
export function crisisFor(ctx: RunContext, step: StepDef, s: Pick<RunState, 'answers'>): CrisisSlot | null {
  const sc = scope(ctx, s);
  return step.crisis?.find((c) => holds(c.when, sc)) ?? null;
}

/** The ask-fresh answers this run carries (e.g. `fitsFacts`). */
export function askFresh(ctx: RunContext, s: Pick<RunState, 'answers'>): Partial<Record<NonNullable<FieldDef['askFresh']>, string>> {
  const out: Partial<Record<NonNullable<FieldDef['askFresh']>, string>> = {};
  for (const f of allFields(ctx.skill)) {
    const v = s.answers[f.id]?.ids[0];
    if (f.askFresh && v) out[f.askFresh] = v;
  }
  return out;
}

/** What a hand-off carries to the next tool: the exit's `carry` fields' picks (the hand-off's emotions). */
export function carried(exit: ExitDef, s: Pick<RunState, 'answers'>): string[] {
  return exit.carry.flatMap((f) => s.answers[f]?.ids ?? []);
}

/** The `ext.run` attempt record (functions/src/spine/extSchemas.ts `run`). Ids only, plus own words. */
export function runRecord(ctx: RunContext, s: RunState): Record<string, unknown> {
  const answers = Object.entries(s.answers)
    .filter(([, a]) => a.ids.length > 0 || a.own)
    .map(([fieldId, a]) => ({ fieldId, optionIds: a.ids.slice(0, 12), ...(a.own ? { valueOwn: a.own.trim().slice(0, ctx.skill.ownMax) } : {}) }))
    .filter((a) => a.optionIds.length > 0 || a.valueOwn)
    .slice(0, 32);
  // An exit to a persist-nothing tool is never named in the host's record (offered or taken).
  const recorded = (exitId: string) => {
    const tool = ctx.skill.exits.find((x) => x.id === exitId)?.toolId;
    return tool && ctx.privateTools?.has(tool) ? PRIVATE_EXIT : exitId;
  };
  const offered = [...new Set(s.offered.map(recorded))];
  const ctxRec = Object.fromEntries(RECORDED_CTX.filter((k) => ctx.ctxIn?.[k]).map((k) => [k, ctx.ctxIn![k]]));
  const out = Object.values(s.out ?? {}).slice(0, 8).map((r) => ({
    embed: r.embed, stepId: r.stepId,
    ...(r.ids.length ? { optionIds: r.ids } : {}),
    ...(r.own ? { valueOwn: r.own } : {}),
    ...(r.durationSec !== undefined ? { durationSec: r.durationSec } : {}),
    ...(r.doneCount !== undefined ? { doneCount: r.doneCount } : {}),
    ...(r.earlyCount !== undefined ? { earlyCount: r.earlyCount } : {}),
  }));
  return {
    skillId: ctx.skill.id,
    versionId: ctx.skill.version,
    path: s.path,
    ...(answers.length ? { answers } : {}),
    ...(offered.length ? { offeredExitIds: offered } : {}),
    ...(s.exitId ? { exitId: recorded(s.exitId) } : {}),
    ...(s.shown.length ? { embedsShown: s.shown } : {}),
    ...(Object.keys(ctxRec).length ? { ctx: ctxRec } : {}),
    ...(out.length ? { out } : {}),
    ...(Object.keys(s.kept ?? {}).length ? { kept: [...new Set(Object.values(s.kept).map((k) => k.kind))].slice(0, 8) } : {}),
    ...(Object.keys(s.scheduled ?? {}).length ? { scheduled: [...new Set(Object.values(s.scheduled).map((k) => k.type))].slice(0, 8) } : {}),
  };
}
