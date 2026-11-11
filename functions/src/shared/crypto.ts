/**
 * Own words, encrypted at the application layer (docs/design/user-profile.md §8 #4, decision P5).
 *
 * Envelope encryption: every person has one data key (AES-256), created on first use and stored on
 * their User node wrapped by the master key (`User.ownKeyWrapped`, a system field: never exported,
 * deleted with the User). Own-words values are stored as `enc:v1:<base64(iv | tag | ciphertext)>`
 * (AES-256-GCM, the uid as additional data, so a value copied to another person's record won't open).
 *
 * The master key comes from a `KeyProvider`. Production: the Firebase secret OWN_WORDS_KEY (32 bytes,
 * base64), declared by every callable through shared/callOptions.ts. Cloud KMS can replace it later
 * behind the same interface without touching stored values (only the wrapped keys are rewrapped).
 *
 * Rules (tests/own-words.test.mjs, functions/test/unit/crypto.test.cjs):
 * - Length limits apply to the plaintext, before encryption; validators don't change.
 * - Own words never go into a WHERE, ORDER BY, CONTAINS or aggregate: they can't, once encrypted.
 * - decryptOwn passes a plain string through unchanged, so values written before encryption, and a
 *   gradual migration, keep working.
 * - Export decrypts for the person (decryptDeep); delete removes the key with the User node.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';
/** Anything that runs Cypher: a managed transaction or a session (export runs on a session). */
export interface Runner {
  run(query: string, params?: Record<string, unknown>): Promise<{ records: Array<{ get(key: string): unknown }> }>;
}

export const ownWordsKey = defineSecret('OWN_WORDS_KEY');

export const ENC_PREFIX = 'enc:v1:';
const WRAP_PREFIX = 'wk:v1:';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export interface KeyProvider {
  /** Wrap a person's data key. `uid` is bound in as additional data. */
  wrap(dek: Buffer, uid: string): string;
  unwrap(wrapped: string, uid: string): Buffer;
}

function seal(key: Buffer, plain: Buffer, aad: string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const c = createCipheriv('aes-256-gcm', key, iv);
  c.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]);
}

function open(key: Buffer, sealed: Buffer, aad: string): Buffer {
  if (sealed.length < IV_BYTES + TAG_BYTES) throw new Error('sealed value too short');
  const d = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, IV_BYTES));
  d.setAAD(Buffer.from(aad, 'utf8'));
  d.setAuthTag(sealed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([d.update(sealed.subarray(IV_BYTES + TAG_BYTES)), d.final()]);
}

/** The master key as 32 bytes, or an error that says what's wrong (never the value). */
export function parseMasterKey(b64: string | undefined): Buffer {
  const k = Buffer.from((b64 ?? '').trim(), 'base64');
  if (k.length !== 32) throw new Error('OWN_WORDS_KEY must be 32 bytes, base64-encoded');
  return k;
}

/** A provider over a 32-byte master key held in memory (the secret, or a test key). */
export function secretKeyProvider(master: () => Buffer): KeyProvider {
  return {
    wrap: (dek, uid) => WRAP_PREFIX + seal(master(), dek, `dek:${uid}`).toString('base64'),
    unwrap: (wrapped, uid) => {
      if (!wrapped.startsWith(WRAP_PREFIX)) throw new Error('unknown wrapped key format');
      return open(master(), Buffer.from(wrapped.slice(WRAP_PREFIX.length), 'base64'), `dek:${uid}`);
    },
  };
}

let provider: KeyProvider = secretKeyProvider(() => parseMasterKey(ownWordsKey.value()));
/** Unwrapped data keys, per function instance. Keyed by uid + wrapped value, so a new key never reuses an old entry. */
const cache = new Map<string, Buffer>();
const CACHE_MAX = 500;

/** Test seam: a provider over a fixed key (null restores the secret). Never re-exported from index.ts. */
export function setKeyProviderForTesting(p: KeyProvider | null): void {
  provider = p ?? secretKeyProvider(() => parseMasterKey(ownWordsKey.value()));
  cache.clear();
}

function remember(uid: string, wrapped: string): Buffer {
  const k = `${uid}|${wrapped}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const dek = provider.unwrap(wrapped, uid);
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(k, dek);
  return dek;
}

/** Read the person's wrapped key (READ or WRITE tx). Null when they have none yet. */
export const READ_KEY_QUERY = `MATCH (u:User {id: $uid}) RETURN u.ownKeyWrapped AS w`;
/** Create the key once: a concurrent first use keeps whichever landed first. Needs a WRITE tx. */
export const ENSURE_KEY_QUERY = `MERGE (u:User {id: $uid})
  ON CREATE SET u.createdAt = datetime()
  SET u.ownKeyWrapped = coalesce(u.ownKeyWrapped, $w)
  RETURN u.ownKeyWrapped AS w`;

async function dataKey(tx: Runner, uid: string, create: boolean): Promise<Buffer | null> {
  const r = await tx.run(READ_KEY_QUERY, { uid });
  let w = r.records[0]?.get('w') as string | null | undefined;
  if (!w && create) {
    const fresh = provider.wrap(randomBytes(32), uid);
    w = (await tx.run(ENSURE_KEY_QUERY, { uid, w: fresh })).records[0]?.get('w') as string | undefined;
  }
  return w ? remember(uid, w) : null;
}

export const isEncrypted = (v: unknown): boolean => typeof v === 'string' && v.startsWith(ENC_PREFIX);

/** Encrypt with a key already in hand (pure; used by the tx helpers and tests). */
export function encryptWith(dek: Buffer, uid: string, text: string): string {
  return ENC_PREFIX + seal(dek, Buffer.from(text, 'utf8'), `own:${uid}`).toString('base64');
}

/** Decrypt with a key already in hand. A plain string comes back unchanged. */
export function decryptWith(dek: Buffer | null, uid: string, value: string): string | null {
  if (!isEncrypted(value)) return value;
  if (!dek) return null;
  return open(dek, Buffer.from(value.slice(ENC_PREFIX.length), 'base64'), `own:${uid}`).toString('utf8');
}

/**
 * Encrypt one own-words value inside a WRITE transaction (creates the person's key on first use).
 * Null, undefined and '' pass through; an already encrypted value is left as it is.
 */
export async function encryptOwn(tx: Runner, uid: string, text: string | null | undefined): Promise<string | null> {
  if (text === null || text === undefined || text === '') return text ?? null;
  if (isEncrypted(text)) return text;
  const dek = await dataKey(tx, uid, true);
  return encryptWith(dek as Buffer, uid, text);
}

/**
 * Decrypt one stored value (READ or WRITE tx). Plain strings pass through. A value that can't be opened
 * (the key is gone or the value was tampered with) reads as null, never as ciphertext on screen.
 */
export async function decryptOwn(tx: Runner, uid: string, value: unknown): Promise<string | null> {
  if (typeof value !== 'string') return null;
  if (!isEncrypted(value)) return value;
  try {
    return decryptWith(await dataKey(tx, uid, false), uid, value);
  } catch {
    return null;
  }
}

/** A key-holding decrypter for many values in one go (one key read). */
export async function ownDecrypter(tx: Runner, uid: string): Promise<(v: unknown) => string | null> {
  let dek: Buffer | null = null;
  try {
    dek = await dataKey(tx, uid, false);
  } catch {
    dek = null;
  }
  return (v: unknown) => {
    if (typeof v !== 'string') return null;
    try {
      return decryptWith(dek, uid, v);
    } catch {
      return null;
    }
  };
}

/**
 * Every encrypted string inside a value, decrypted: plain values, arrays, objects, and JSON-object
 * strings (ToolSession.ext, ProfileItem.valueJson). Used by export, so the person gets their words back.
 */
export function decryptDeep(v: unknown, dec: (s: string) => string | null): unknown {
  if (typeof v === 'string') {
    if (isEncrypted(v)) return dec(v);
    if (v.startsWith('{') && v.includes(ENC_PREFIX)) {
      try {
        return JSON.stringify(decryptDeep(JSON.parse(v), dec));
      } catch {
        return v;
      }
    }
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => decryptDeep(x, dec));
  if (v && typeof v === 'object' && (v as object).constructor === Object) {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, decryptDeep(x, dec)]));
  }
  return v;
}
