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
 */
import type { CrisisSlot, EmbedOutput, EmbedOutputSchema, ExitDef, FieldDef, OptionDef, SkillDef, SkillsContent, StepDef } from '../../data/skillTypes';
import { holds, resolve, type Answer, type Answers, type Scope } from './conditions';

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
}

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
}

export type RunEvent =
  | { type: 'pick'; fieldId: string; value: string }
  | { type: 'own'; fieldId: string; text: string }
  | { type: 'shown'; record: string }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'exit'; exitId: string }
  | { type: 'embedDone'; output: EmbedOutput };

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

export function initialRun(skill: SkillDef): RunState {
  return { stepId: skill.start, path: [skill.start], answers: {}, shown: [], offered: [], exitId: null, out: {} };
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

/** The emotion words a field offers: carried first, then its own list, then any pick from the full list. */
export function emotionChoices(ctx: RunContext, field: FieldDef, answers: Answers): string[] {
  const own = field.options.emotions ?? [];
  const carried = field.options.carriedFirst ? ctx.carried.filter((id) => ctx.gridIds.has(id)) : [];
  const picked = answers[field.id]?.ids ?? [];
  return [...new Set([...carried, ...own, ...picked])];
}

/** A list field's chips, grouped (alternatives per story) or as one group. */
export function optionGroups(ctx: RunContext, field: FieldDef, answers: Answers, sc: Scope = scope(ctx, { answers })): OptionGroup[] {
  const src = field.options;
  if (!src.list) return [];
  let list = (ctx.skill.options[src.list] ?? []).filter((opt) => holds(src.where, { ...sc, opt }));
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

/** Every value a field may hold right now. */
function validValues(ctx: RunContext, field: FieldDef, answers: Answers, sc: Scope): Set<string> | null {
  if (field.options.emotions) return null; // any grid word (checked at the pick)
  return new Set(optionGroups(ctx, field, answers, sc).flatMap((g) => g.options.map((o) => o.value)));
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

function pick(ctx: RunContext, f: FieldDef, a: Answer, value: string): Answer {
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
      return {
        ...after, stepId: to.id, path: [...after.path, to.id].slice(0, PATH_MAX),
        offered: to.kind === 'handoff' ? offersFor(ctx, to, after) : after.offered,
      };
    }
    case 'back': {
      const i = s.path.lastIndexOf(s.stepId);
      const prev = i > 0 ? s.path[i - 1] : null;
      if (!prev || prev === s.stepId) return s;
      return { ...s, stepId: prev, path: [...s.path, prev].slice(0, PATH_MAX), offered: [] };
    }
    case 'exit':
      return ctx.skill.exits.some((x) => x.id === e.exitId && !x.planned && !x.safety) ? { ...s, exitId: e.exitId } : s;
  }
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
    const v = s.answers[src.labelOf]?.ids[0];
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
  const sc = scope(ctx, s);
  return (field.links ?? []).filter((l) => holds(l.when, sc)).flatMap((l) => {
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
    ...(s.offered.length ? { offeredExitIds: s.offered } : {}),
    ...(s.exitId ? { exitId: s.exitId } : {}),
    ...(s.shown.length ? { embedsShown: s.shown } : {}),
    ...(Object.keys(ctxRec).length ? { ctx: ctxRec } : {}),
    ...(out.length ? { out } : {}),
  };
}
