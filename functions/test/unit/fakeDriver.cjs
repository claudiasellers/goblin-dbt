'use strict';
/**
 * Tier-1 test harness: a fake neo4j-driver plus a loader for the built callables (functions/lib).
 * No network, no Docker, no emulator. Callables run in-process via v2's `CallableFunction.run(request)`.
 *
 *   const { loadFunctions, fakeDriver, record } = require('./fakeDriver.cjs');
 *   const { fns, setDriver } = loadFunctions();
 *   const f = fakeDriver((query, params) => [{ id: 'c1' }]);   // rows → records
 *   setDriver(f.driver);
 *   await fns.saveCheckIn.run({ auth: { uid: 'u1' }, data: {...} });
 *   f.calls  // [{ query, params, session }]
 */
const path = require('node:path');

// firebase-admin / firebase-functions read these at import time; a demo- id never reaches production.
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-goblindbt';
process.env.FIREBASE_CONFIG = process.env.FIREBASE_CONFIG || JSON.stringify({ projectId: 'demo-goblindbt' });

const LIB = path.resolve(__dirname, '../../lib');

/** The built module (functions/lib/index.js) and the driver seam. Build first (`npm test` does). */
function loadFunctions() {
  const fns = require(path.join(LIB, 'index.js'));
  const { setDriverForTesting } = require(path.join(LIB, 'shared/neo4j.js'));
  return { fns, setDriver: setDriverForTesting };
}

/** A neo4j Record look-alike: `get` throws on unknown keys, like the real driver. */
function record(obj) {
  const keys = Object.keys(obj);
  return {
    keys,
    length: keys.length,
    has: (k) => keys.includes(k),
    get: (k) => {
      if (!keys.includes(k)) throw new Error(`fake record has no field ${JSON.stringify(k)}`);
      return obj[k];
    },
    toObject: () => ({ ...obj }),
  };
}

/**
 * A fake driver. `responder(query, params, callIndex)` returns an array of plain row objects
 * (turned into records), a result-shaped object `{ records }`, or throws / returns an Error to
 * make the query fail. Sessions record every query; `executeRead`/`executeWrite` pass the
 * session itself as the transaction.
 */
function fakeDriver(responder = () => []) {
  const calls = [];
  const sessions = [];
  const newSession = (config = {}) => {
    const session = {
      config,
      closed: false,
      async run(query, params = {}) {
        if (session.closed) throw new Error('fake session used after close');
        const index = calls.length;
        calls.push({ query, params, session });
        const out = await responder(query, params, index);
        if (out instanceof Error) throw out;
        if (out && !Array.isArray(out) && Array.isArray(out.records)) return { summary: {}, ...out };
        return { records: (out || []).map((row) => (typeof row?.get === 'function' ? row : record(row))), summary: {} };
      },
      executeRead: async (fn) => fn(session),
      executeWrite: async (fn) => fn(session),
      async close() { session.closed = true; },
    };
    sessions.push(session);
    return session;
  };
  return {
    calls,
    sessions,
    driver: { session: newSession, close: async () => {}, verifyConnectivity: async () => ({}) },
    /** true when every session opened so far has been closed */
    allClosed: () => sessions.every((s) => s.closed),
  };
}

/** A Neo4j-style error carrying a server status code. */
function neo4jError(code, message = code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

module.exports = { loadFunctions, fakeDriver, record, neo4jError };
