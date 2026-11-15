/**
 * The skill runtime's condition language (docs/design/skill-runtime.md, "Conditions"). Pure, total, no eval:
 * transitions, `showWhen`, option filters, offers, links and conditional copy all use it.
 *
 * Refs: `$a.<field>` (its first pick), `$a.<field>.ids` (every pick), `$a.<field>.own` (own words),
 * `$d.<name>` (a derived value), `$opt.<prop>` (the option under test), `$ctx.<key>` (what the page that opened
 * the skill passed in: an urge, a person, a frame, a carried band; only keys the skill `accepts`), `$p.<slice>`
 * (a profile slice the skill's tool declares in PROFILE_NEEDS: present when the person has kept something there;
 * `.ids` its items' ids), `$each` (R16: the pick a per-pick step is for, such as Do the Opposite's feeling; null on
 * any other step), `$carried` (the grid words a link or hand-off carried in: read by conditions only, never a pick;
 * Give your mind a job's ceilings). Anything else is a literal.
 * `{set: '$a.<field>'}` is true for a pick or own words; every other operator reads the first pick.
 */
import type { Cond, OptionDef } from '../../data/skillTypes';

/** `ownAt`: how many of `ids` were picked before the own words (the oldest-first swap); absent means after them all. */
export interface Answer { ids: string[]; own: string | null; ownAt?: number }
export type Answers = Record<string, Answer>;

export interface Scope {
  answers: Answers;
  derived: Record<string, unknown>;
  /** The option under test (option filters, `some`). */
  opt?: OptionDef;
  /** The option objects a field's picks are (for `some`). */
  picked: (fieldId: string) => OptionDef[];
  /** Context in (`$ctx.*`): ids only, absent keys are null. */
  ctx?: Readonly<Record<string, string>>;
  /** Profile slices (`$p.*`): only what the tool's PROFILE_NEEDS reads; null while loading or signed out. */
  profile?: Readonly<Record<string, unknown>> | null;
  /** `$carried`: the grid words a link or hand-off carried in (ids only; never selected, never recorded). */
  carried?: readonly string[];
}

/** A profile item's id (most items have `id`; a kept witness line has `lineId`). */
export function profileItemId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as { id?: unknown; lineId?: unknown };
  return typeof o.id === 'string' ? o.id : typeof o.lineId === 'string' ? o.lineId : null;
}

/** The carried words ref: `{has: ['$carried', '<word id>']}`. */
export const CARRIED = '$carried';

/** The answers key a per-pick step's view puts its pick under (R16, machine.ts `answersOf`). */
export const EACH = '$each';
/**
 * Where a reopened run keeps the last round's answer to each field its `reopens` step clears (`$prev.<field>`): read by
 * conditions only, never shown on a chip (no pre-fill), never recorded. Build mastery's *done twice at this rung*.
 */
export const PREV_KEY = 'prev.';

const REF = /^\$(a|prev|d|opt|ctx|p)\.([A-Za-z_][A-Za-z0-9_]*)(?:\.(ids|own))?$/;

/** A ref's value, or the literal itself. */
export function resolve(v: unknown, scope: Scope): unknown {
  if (typeof v !== 'string' || !v.startsWith('$')) return v;
  if (v === EACH) return scope.answers[EACH]?.ids[0] ?? null;
  if (v === CARRIED) return [...(scope.carried ?? [])];
  const m = REF.exec(v);
  if (!m) return null;
  const [, kind, name, part] = m;
  if (kind === 'a' || kind === 'prev') {
    // `$prev.<field>`: the last round's answer to a field the reopened step clears (PREV_KEY), display-free.
    const a = scope.answers[kind === 'prev' ? `${PREV_KEY}${name}` : name];
    if (part === 'ids') return a?.ids ?? [];
    if (part === 'own') return a?.own ?? null;
    return a?.ids[0] ?? null;
  }
  if (kind === 'd') return scope.derived[name] ?? null;
  // A context value is one id: `.ids` / `.own` mean nothing on it (build.py refuses them too).
  if (kind === 'ctx') return part ? null : scope.ctx?.[name] ?? null;
  if (kind === 'p') {
    const v = scope.profile?.[name] ?? null;
    if (part === 'own') return null;
    if (part === 'ids') return Array.isArray(v) ? v.map(profileItemId).filter((x): x is string => !!x) : [];
    return v;
  }
  return (scope.opt as Record<string, unknown> | undefined)?.[name] ?? null;
}

const present = (v: unknown) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);

/** Whether the condition holds. A null / undefined condition always does. */
export function holds(c: Cond | null | undefined, scope: Scope): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every((x) => holds(x, scope));
  if ('any' in c) return c.any.some((x) => holds(x, scope));
  if ('not' in c) return !holds(c.not, scope);
  if ('set' in c) {
    const m = REF.exec(c.set);
    if (m && m[1] === 'a' && !m[3]) {
      const a = scope.answers[m[2]];
      return !!a && (a.ids.length > 0 || !!a.own);
    }
    return present(resolve(c.set, scope));
  }
  if ('own' in c) return !!scope.answers[c.own]?.own;
  if ('eq' in c) return resolve(c.eq[0], scope) === resolve(c.eq[1], scope);
  if ('in' in c) {
    const v = resolve(c.in[0], scope);
    return Array.isArray(c.in[1]) && c.in[1].includes(v);
  }
  if ('has' in c) {
    const list = resolve(c.has[0], scope);
    return Array.isArray(list) && list.includes(resolve(c.has[1], scope));
  }
  if ('some' in c) {
    const [fieldId, inner] = c.some;
    return scope.picked(fieldId).some((opt) => holds(inner, { ...scope, opt }));
  }
  return false;
}
