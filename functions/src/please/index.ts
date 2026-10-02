/**
 * PLEASE ("Running low", app tool please-skill): DBT reducing vulnerability. Public content, no user
 * data. The flow document is generated from scripts/please/content.py into schema/please.cypher.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import type { PleaseContent } from './types';

export const PLEASE_VERSION = 'please-v1';

/** The whole flow in one call (the client caches it per page load). */
export const getPleaseContent = callable<unknown, PleaseContent>(
  { auth: 'public', label: 'getPleaseContent', errorMessage: 'Could not load content' },
  async () => readTx(async (tx) => {
    const res = await tx.run(
      `MATCH (f:PleaseFlow {id: 'please_flow'}) RETURN f.version AS version, f.contentJson AS content`);
    const rec = res.records[0];
    if (!rec || rec.get('version') !== PLEASE_VERSION) {
      throw new HttpsError('failed-precondition', 'PLEASE content migration is required');
    }
    return JSON.parse(rec.get('content') as string) as PleaseContent;
  }),
);
