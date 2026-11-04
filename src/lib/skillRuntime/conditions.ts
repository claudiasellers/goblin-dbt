/**
 * The skill runtime's condition language (docs/design/skill-runtime.md, "Conditions"). Pure, total, no eval:
 * transitions, `showWhen`, option filters, offers, links and conditional copy all use it.
 *
 * Refs: `$a.<field>` (its first pick), `$a.<field>.ids` (every pick), `$a.<field>.own` (own words),
 * `$d.<name>` (a derived value), `$opt.<prop>` (the option under test). Anything else is a literal.
 * `{set: '$a.<field>'}` is true for a pick or own words; every other operator reads the first pick.
 */
import type { Cond, OptionDef } from '../../data/skillTypes';

export interface Answer { ids: string[]; own: string | null }
export type Answers = Record<string, Answer>;

export interface Scope {
  answers: Answers;
  derived: Record<string, unknown>;
  /** The option under test (option filters, `some`). */
  opt?: OptionDef;
  /** The option objects a field's picks are (for `some`). */
  picked: (fieldId: string) => OptionDef[];
}

const REF = /^\$(a|d|opt)\.([A-Za-z_][A-Za-z0-9_]*)(?:\.(ids|own))?$/;

/** A ref's value, or the literal itself. */
export function resolve(v: unknown, scope: Scope): unknown {
  if (typeof v !== 'string' || !v.startsWith('$')) return v;
  const m = REF.exec(v);
  if (!m) return null;
  const [, kind, name, part] = m;
  if (kind === 'a') {
    const a = scope.answers[name];
    if (part === 'ids') return a?.ids ?? [];
    if (part === 'own') return a?.own ?? null;
    return a?.ids[0] ?? null;
  }
  if (kind === 'd') return scope.derived[name] ?? null;
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
