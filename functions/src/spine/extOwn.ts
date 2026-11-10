/**
 * Own words inside `ToolSession.ext` (every `text` field of a registered namespace: the `*Own` keys)
 * are stored encrypted (shared/crypto.ts). The schema already says which keys are own words, so a new
 * namespace's text fields are covered with no change here. Lengths were checked on the plaintext by
 * validateExt before this runs.
 */
import type { ManagedTransaction } from 'neo4j-driver';
import { encryptOwn, ownDecrypter, decryptDeep } from '../shared/crypto';
import { EXT_SCHEMAS } from './extSchemas';

type Schema = Record<string, { t: string; of?: unknown }>;

async function walk(schema: Schema, v: unknown, enc: (s: string) => Promise<string | null>): Promise<unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    const f = schema[k];
    if (!f) { out[k] = x; continue; }
    if (f.t === 'text' && typeof x === 'string') out[k] = await enc(x);
    else if (f.t === 'obj') out[k] = await walk(f.of as Schema, x, enc);
    else if (f.t === 'objs' && Array.isArray(x)) out[k] = await Promise.all(x.map((y) => walk(f.of as Schema, y, enc)));
    else out[k] = x;
  }
  return out;
}

/** The validated ext JSON with every own-words value encrypted (WRITE tx). Null stays null. */
export async function encryptExtOwn(tx: ManagedTransaction, uid: string, ext: string | null): Promise<string | null> {
  if (!ext) return ext;
  const parsed = JSON.parse(ext) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [ns, v] of Object.entries(parsed)) {
    out[ns] = EXT_SCHEMAS[ns] ? await walk(EXT_SCHEMAS[ns] as Schema, v, (s) => encryptOwn(tx, uid, s)) : v;
  }
  return JSON.stringify(out);
}

/** A stored ext JSON with its own words readable again (READ or WRITE tx), for readers that show them back. */
export async function decryptExtOwn(tx: ManagedTransaction, uid: string, ext: unknown): Promise<unknown> {
  if (typeof ext !== 'string' || !ext) return ext;
  const dec = await ownDecrypter(tx, uid);
  return decryptDeep(ext, dec);
}
