/**
 * The safety route's step machine (CORE-01, docs/design/safety-route.md), pure so it is tested without React.
 * `SafetyRoute.tsx` renders `state.screen`; `recordFor` is what `saveSafetyCheck` receives (ids and enums only).
 *
 * Entries:
 *   - `checkin`: the check-in asked (`safetyAsk`): the question with *No*.
 *   - `said`: the person said it (Help & safety's *I'm thinking about hurting myself*, a skill's safety.open):
 *     people first, then *Thanks for saying it. Which is closest right now?* (no *No*).
 *   - `help_now`: Help me now's link: people first, then *Let's get you to people first…* (no *No*).
 *   - `morning`: the next-morning check from Today (`safety_checkin`); *I'm not safe* moves to `said`.
 *
 * Paths: no → done. Rather not say → the calm line and people. Passing → the line, people, a quick plan, the
 * morning check. Strong → one thing to make right now safer (means), then people and a quick plan. A plan or an
 * act → *Have you already done something?* first: yes / not sure → took or injury → medical first (the
 * emergency number; *It's not that kind of hurt* only after a known injury → first aid), then means; no → means.
 * *I'm okay for now* → the exit (plan · contacted · stop) → *Can I check in tomorrow morning?* (signed in, any
 * answer above no) → done. Nothing about method is recorded: `act` / `kind` only pick screens.
 */
import type { SafetyAnswer, SafetyChoice, SafetyContent, SafetyCountry } from '../data/safetyTypes';

/** The header's way to the route, shown before the content chunk loads: content's `flow.header.label` (test-pinned). */
export const HELP_AND_SAFETY_LABEL = 'Help & safety';
/** `header.say`, for screens that link to the route before its content has loaded (Help me now). */
export const SAY_LABEL = "I'm thinking about hurting myself";
/** Where *I'm thinking about hurting myself* goes from Help me now. */
export const HELP_NOW_SAY_HREF = '/safety?say=1&from=help_now';

export type SafetyEntry = 'checkin' | 'said' | 'help_now' | 'morning';

export type SafetyScreen =
  | 'question' | 'passing' | 'declined' | 'act' | 'kind' | 'medical' | 'first_aid' | 'means' | 'means_actions'
  | 'strong' | 'quick_plan' | 'exit' | 'checkin' | 'morning' | 'morning_answer' | 'done';

export type SafetyExit = 'plan' | 'contacted' | 'stop';
export type ActAnswer = 'yes' | 'no' | 'not_sure';
export type MorningAnswer = 'okay' | 'hard' | 'not_safe';

export interface SafetyRouteState {
  entry: SafetyEntry;
  screen: SafetyScreen;
  answer: SafetyAnswer | null;
  act: ActAnswer | null;
  kind: 'took' | 'injury' | 'not_sure' | null;
  meansAsked: boolean;
  meansActions: string[];
  contacted: 'line' | 'person' | null;
  usedPlan: boolean;
  exit: SafetyExit | null;
  morningCheck: 'yes' | 'no' | null;
  morningAnswer: MorningAnswer | null;
  /** Screens behind this one, for Back. */
  trail: SafetyScreen[];
}

export type SafetyEvent =
  | { type: 'answer'; id: SafetyAnswer }
  | { type: 'act'; id: ActAnswer }
  | { type: 'kind'; id: 'took' | 'injury' | 'not_sure' }
  | { type: 'medical'; id: 'got_help' | 'getting_help' | 'not_that_kind' }
  | { type: 'first_aid_done' }
  | { type: 'means'; id: 'yes' | 'not_sure' | 'no' }
  | { type: 'means_done'; ids: string[] }
  | { type: 'contacted'; how: 'line' | 'person' }
  | { type: 'quick_plan' }
  | { type: 'plan_kept' }
  | { type: 'leave' }
  | { type: 'exit'; id: SafetyExit }
  | { type: 'checkin'; id: 'yes' | 'no' }
  | { type: 'carry_on' }
  | { type: 'morning'; id: MorningAnswer }
  | { type: 'back' };

export const ACT_ANSWERS = ['yes', 'no', 'not_sure'] as const;
const MEANS_ACTIONS = ['other_room', 'give_someone', 'lock_away', 'leave_room', 'cant_now'];
const RANK: Record<SafetyAnswer, number> = { no: 0, declined: 1, passing: 1, strong: 2, plan: 3, act: 4 };

export function startState(entry: SafetyEntry): SafetyRouteState {
  return {
    entry, screen: entry === 'morning' ? 'morning' : 'question', answer: null, act: null, kind: null,
    meansAsked: false, meansActions: [], contacted: null, usedPlan: false, exit: null, morningCheck: null,
    morningAnswer: null, trail: [],
  };
}

/** The question's title and choices for this entry (checkin keeps *No*; the others say it was said). */
export function questionFor(c: SafetyContent, entry: SafetyEntry): { title: string; choices: SafetyChoice<SafetyAnswer>[] } {
  const q = c.flow.question;
  if (entry === 'checkin') return { title: q.title, choices: q.choices };
  return { title: entry === 'help_now' ? q.helpNowTitle : q.saidTitle, choices: q.saidChoices };
}

/** People above the question: every entry but the check-in's (which asks first, plainly, once). */
export const peopleFirst = (s: SafetyRouteState): boolean => s.screen === 'question' && s.entry !== 'checkin';

/** The answer as recorded: a plan rises to an act once the person says they already did something. */
export function recordedAnswer(s: SafetyRouteState): SafetyAnswer | null {
  if (!s.answer) return null;
  return s.answer === 'plan' && s.act === 'yes' ? 'act' : s.answer;
}

/** Whether *Can I check in with you tomorrow morning?* is offered (signed in, the answer above no, not yet asked). */
export function offersCheckin(s: SafetyRouteState, signedIn: boolean): boolean {
  const a = recordedAnswer(s);
  return signedIn && !!a && RANK[a] > 0 && s.morningCheck == null;
}

/** The medical screen's choices: *It's not that kind of hurt* only after a known injury (never after something taken). */
export function medicalChoices(c: SafetyContent, s: SafetyRouteState): SafetyChoice[] {
  return c.flow.act.medicalChoices.filter((ch) => !ch.showWhen || Object.entries(ch.showWhen).every(([k, v]) => (s as unknown as Record<string, unknown>)[k] === v));
}

const go = (s: SafetyRouteState, screen: SafetyScreen, patch: Partial<SafetyRouteState> = {}): SafetyRouteState =>
  ({ ...s, ...patch, screen, trail: [...s.trail, s.screen] });

/** Where the route goes after the exit or *Carry on*. */
const afterExit = (s: SafetyRouteState, signedIn: boolean, patch: Partial<SafetyRouteState>): SafetyRouteState => {
  const next = { ...s, ...patch };
  return go(next, offersCheckin(next, signedIn) ? 'checkin' : 'done');
};

export function step(s: SafetyRouteState, e: SafetyEvent, signedIn: boolean): SafetyRouteState {
  switch (e.type) {
    case 'answer':
      if (s.screen !== 'question') return s;
      if (e.id === 'no') return go(s, 'done', { answer: 'no' });
      if (e.id === 'declined') return go(s, 'declined', { answer: 'declined' });
      if (e.id === 'passing') return go(s, 'passing', { answer: 'passing' });
      if (e.id === 'strong') return go(s, 'means', { answer: 'strong' });
      return go(s, 'act', { answer: 'plan' });
    case 'act':
      if (s.screen !== 'act') return s;
      return e.id === 'no' ? go(s, 'means', { act: 'no' }) : go(s, 'kind', { act: e.id });
    case 'kind':
      return s.screen === 'kind' ? go(s, 'medical', { kind: e.id }) : s;
    case 'medical':
      if (s.screen !== 'medical') return s;
      // Only after a known injury, as the content's showWhen says (never after something taken: harm is delayed).
      if (e.id === 'not_that_kind') return s.act === 'yes' && s.kind === 'injury' ? go(s, 'first_aid') : s;
      return go(s, 'means', e.id === 'got_help' ? { contacted: 'person' } : {});
    case 'first_aid_done':
      return s.screen === 'first_aid' ? go(s, 'means') : s;
    case 'means':
      if (s.screen !== 'means') return s;
      return e.id === 'no' ? go(s, 'strong', { meansAsked: true }) : go(s, 'means_actions', { meansAsked: true });
    case 'means_done':
      if (s.screen !== 'means_actions') return s;
      return go(s, 'strong', { meansActions: [...new Set([...s.meansActions, ...e.ids.filter((x) => MEANS_ACTIONS.includes(x))])] });
    case 'contacted':
      return s.contacted === 'line' || s.contacted === 'person' ? s : { ...s, contacted: e.how };
    case 'quick_plan':
      return s.screen === 'quick_plan' ? s : go(s, 'quick_plan');
    case 'plan_kept':
      return { ...s, usedPlan: true };
    case 'leave':
      return s.screen === 'done' || s.screen === 'exit' ? s : go(s, 'exit');
    case 'exit':
      if (s.screen !== 'exit') return s;
      return afterExit(s, signedIn, {
        exit: e.id,
        ...(e.id === 'plan' ? { usedPlan: true } : {}),
        ...(e.id === 'contacted' && !s.contacted ? { contacted: 'person' as const } : {}),
      });
    case 'carry_on':
      return s.screen === 'passing' || s.screen === 'declined' ? afterExit(s, signedIn, {}) : s;
    case 'checkin':
      return s.screen === 'checkin' ? go(s, 'done', { morningCheck: e.id }) : s;
    case 'morning':
      if (s.screen !== 'morning') return s;
      // Not safe: the said route, fresh (a new visit, recorded from the follow-up).
      if (e.id === 'not_safe') return { ...startState('said'), morningAnswer: 'not_safe' };
      return go(s, 'morning_answer', { morningAnswer: e.id });
    case 'back': {
      if (!s.trail.length || s.screen === 'done') return s;
      return { ...s, screen: s.trail[s.trail.length - 1], trail: s.trail.slice(0, -1) };
    }
  }
}

export interface SafetyCheckRecord {
  id: string;
  source: string;
  sourceSessionId: string | null;
  answer: SafetyAnswer;
  medical: ActAnswer | null;
  meansAsked: boolean;
  meansActions: string[];
  contacted: 'line' | 'person' | null;
  usedPlan: boolean;
  exit: SafetyExit | null;
  morningCheck: 'yes' | 'no' | null;
  country: string | null;
}

/** What saveSafetyCheck receives, or null before the first answer. Never `kind`: method is never stored. */
export function recordFor(s: SafetyRouteState, base: { id: string; source: string; sourceSessionId?: string | null; country: string | null }): SafetyCheckRecord | null {
  const answer = recordedAnswer(s);
  if (!answer) return null;
  return {
    id: base.id, source: base.source, sourceSessionId: base.sourceSessionId ?? null, answer,
    medical: s.act, meansAsked: s.meansAsked, meansActions: s.meansActions, contacted: s.contacted,
    usedPlan: s.usedPlan, exit: s.exit, morningCheck: s.morningCheck, country: base.country,
  };
}

// ── People: which country's lines ──

export const COUNTRY_KEY = 'goblin.safety.country.v1';

/** The person's region from the browser's languages (en-GB → GB), when the content has that country. */
export function countryFromLanguages(langs: readonly string[], countries: readonly SafetyCountry[]): string | null {
  const ids = new Set(countries.map((c) => c.id));
  for (const l of langs) {
    const region = l.split('-').slice(1).find((p) => /^[A-Za-z]{2}$/.test(p))?.toUpperCase();
    if (region && ids.has(region)) return region;
  }
  return null;
}

/** `sms:` link that pre-fills the body on both iOS and Android. */
export function smsHref(number: string, body: string | null): string {
  return `sms:${number.replace(/\s+/g, '')}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;
}
export const telHref = (number: string): string => `tel:${number.replace(/[^\d+]/g, '')}`;

/** Fill `{name}` slots in route copy. */
export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

// ── Device-only memory (never the server's): asked this session, the morning answers, the quick plan ──

export const ASKED_KEY = 'goblin.safety.asked.v1';
export const MORNING_KEY = 'goblin.safety.morning.v1';
export const QUICK_PLAN_KEY = 'goblin.safety.quickPlan.v1';

/** Two hard mornings in a row: the last answer was *Still hard*, within 36 h. */
export function twiceHard(prev: { answer: string; at: number } | null, now: number): boolean {
  return !!prev && prev.answer === 'hard' && now - prev.at <= 36 * 3_600_000;
}

/** The check-in asks only when the server says so and it hasn't asked in this browser session yet. */
export function shouldAsk(result: { safetyAsk?: { ask: boolean } | null } | null, askedThisSession: boolean): boolean {
  return !!result?.safetyAsk?.ask && !askedThisSession;
}
