'use strict';
/**
 * Tier-2 helpers: talk to the Auth + Functions emulators started by `npm run test:emulator`
 * (firebase emulators:exec --project demo-goblindbt). The functions run against the local
 * Neo4j from test/neo4j/docker-compose.yml, configured through functions/.secret.local.
 */
const PROJECT = process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT.startsWith('demo-')
  ? process.env.GCLOUD_PROJECT
  : 'demo-goblindbt';
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`;
const FUNCTIONS = `http://127.0.0.1:5001/${PROJECT}/us-central1`;

async function post(url, body, headers = {}) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${url} → ${res.status}: ${text.slice(0, 200)}`); }
  return { status: res.status, json };
}

/** Create an Auth-emulator user; returns { idToken, uid }. */
async function signUp(email, password = 'goblin-test-pw') {
  const { json } = await post(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, { email, password, returnSecureToken: true });
  if (!json.idToken) throw new Error(`signUp failed: ${JSON.stringify(json)}`);
  return { idToken: json.idToken, uid: json.localId };
}

/** Call a callable over the callable protocol. Returns `.result`, or throws an Error with `.status`. */
async function call(name, data = {}, idToken) {
  const { json } = await post(`${FUNCTIONS}/${name}`, { data }, idToken ? { Authorization: `Bearer ${idToken}` } : {});
  if (json.error) {
    const e = new Error(`${name}: ${json.error.status} ${json.error.message}`);
    e.status = json.error.status;
    throw e;
  }
  return json.result;
}

/** `{ ok: result }` or `{ error: STATUS }`: goldens pin failures as well as answers. */
async function outcome(name, data, idToken) {
  try { return { ok: await call(name, data, idToken) }; } catch (e) { if (!e.status) throw e; return { error: e.status }; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?(\[[^\]]+\])?$/;
const VOLATILE_KEYS = new Set(['createdAt', 'updatedAt', 'timestamp', 'exportedAt', 'lastLogin', 'lastActive', 'usedAt', 'completedAt', 'dueAt']);

/** Replace ids, uids, emails and timestamps with placeholders so a golden is stable across runs. */
function normalise(value, ctx = {}) {
  if (Array.isArray(value)) return value.map((v) => normalise(v, ctx));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = VOLATILE_KEYS.has(k) && v != null ? '<time>' : normalise(v, ctx);
    }
    return out;
  }
  if (typeof value === 'string') {
    let s = value;
    if (ctx.uid) s = s.split(ctx.uid).join('<uid>');
    if (ctx.email) s = s.split(ctx.email).join('<email>');
    if (UUID.test(s)) return '<uuid>';
    if (ISO.test(s)) return '<time>';
    return s;
  }
  return value;
}

module.exports = { PROJECT, signUp, call, outcome, normalise };
