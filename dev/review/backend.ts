/**
 * The review harness's stand-in for Cloud Functions (dev/parts-review.html). The firebase/* packages are
 * aliased to ./stubs in dev/vite.harness.config.ts, so every httpsCallable the real components make lands
 * here: a surface registers what each callable answers, and every write is logged for the on-screen
 * event list, ids only (any text a person typed shows as ‹own words›). Nothing leaves the page.
 */

type Handler = (data: unknown) => unknown;

const handlers = new Map<string, Handler>();
/** Reads and app plumbing: answered, never listed (the list is "what would be saved"). */
const QUIET = new Set([
  'getPartsEntry', 'getProfileContext', 'getMe', 'getUserProfile', 'updateUserProfile', 'ensureUserExists', 'getToday',
  'getSpineContent', 'getWitnessLines', 'getStateAndTools',
]);

export interface ReviewEvent { n: number; name: string; data: unknown; failed?: boolean }
let events: ReviewEvent[] = [];
let seq = 0;
const listeners = new Set<() => void>();

export const reviewEvents = {
  get: () => events,
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
  clear() { events = []; listeners.forEach((f) => f()); },
};

function push(e: Omit<ReviewEvent, 'n'>) {
  events = [{ n: ++seq, ...e }, ...events].slice(0, 40);
  listeners.forEach((f) => f());
}

/** Ids, enums, numbers, dates and booleans as they are; anything else a person wrote is never shown. */
const ID_LIKE = /^[A-Za-z0-9_.:+-]{1,64}$/;
/** Fields that are always the person's own words (a one-word name included), whatever they look like. */
const OWN_WORDS_KEYS = new Set(['name', 'own', 'ownVoice', 'ownJob', 'ownFear', 'text', 'displayName']);
export function redact(v: unknown, key = ''): unknown {
  if (typeof v === 'string') return ID_LIKE.test(v) && !OWN_WORDS_KEYS.has(key) ? v : '‹own words›';
  if (Array.isArray(v)) return v.map((x) => redact(x, key));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x, k)]));
  return v;
}

/** A write the harness itself stands in for (a host's own callback), listed like a callable. */
export function logEvent(name: string, data: unknown) { push({ name, data: redact(data) }); }

/** What a callable answers in this surface (replaces any earlier answer for that name). */
export function answer(name: string, h: Handler) { handlers.set(name, h); }
export function answers(map: Record<string, Handler>) { for (const [k, h] of Object.entries(map)) handlers.set(k, h); }

/** The stubbed httpsCallable's body. A handler that throws is a failed call (the component's own error path). */
export async function callStub(name: string, data: unknown): Promise<unknown> {
  const h = handlers.get(name);
  try {
    const out = h ? await h(data) : {};
    if (!QUIET.has(name)) push({ name, data: redact(data) });
    return out;
  } catch (e) {
    if (!QUIET.has(name)) push({ name, data: redact(data), failed: true });
    throw e;
  }
}

/** The signed-in reviewer every surface runs as. */
export const REVIEW_USER = { uid: 'review-user', email: 'review@example.test', displayName: null, photoURL: null };
