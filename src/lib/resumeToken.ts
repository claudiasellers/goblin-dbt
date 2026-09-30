/**
 * P2 resume tokens (E3 §A4.2.6). Device-local only: the draft may hold free text, so it never goes
 * to the server. Persisted to localStorage only when the user leaves the host; every accessor is
 * wrapped so a blocked or full storage never breaks a tool.
 */
import type { ResumeToken } from '../data/capacityTypes';

export const RESUME_PREFIX = 'goblin.resume.v1.';
export const RESUME_MAX_BYTES = 16 * 1024;
export const RESUME_TTL_MS = 24 * 3_600_000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Save; false when too big, malformed, or storage is unavailable. */
export function saveResumeToken(t: ResumeToken, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage || t.v !== 1 || !t.toolId || !t.hostSessionId) return false;
  let s: string;
  try {
    s = JSON.stringify(t);
  } catch {
    return false;
  }
  if (new Blob([s]).size > RESUME_MAX_BYTES) return false;
  try {
    storage.setItem(RESUME_PREFIX + t.hostSessionId, s);
    return true;
  } catch {
    return false;
  }
}

/** Take (read + remove) a valid, unexpired token for this tool and host session; else null. */
export function takeResumeToken(
  toolId: string,
  hostSessionId: string,
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage(),
): ResumeToken | null {
  if (!storage) return null;
  const key = RESUME_PREFIX + hostSessionId;
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
    storage.removeItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as ResumeToken;
    if (t.v !== 1 || t.toolId !== toolId || t.hostSessionId !== hostSessionId) return null;
    const exp = Date.parse(t.expiresAt);
    if (Number.isNaN(exp) || exp <= now) return null;
    return t;
  } catch {
    return null;
  }
}

/** Remove every resume token (sign-out). */
export function clearResumeTokens(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(RESUME_PREFIX)) keys.push(k);
    }
    for (const k of keys) storage.removeItem(k);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
