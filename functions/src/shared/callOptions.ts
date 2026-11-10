/**
 * The options every callable is deployed with (one place, so no callable drifts).
 *
 * - secrets: the three Neo4j secrets and OWN_WORDS_KEY (shared/crypto.ts). Set the key once before
 *   the first deploy that includes it: `openssl rand -base64 32 | firebase functions:secrets:set OWN_WORDS_KEY --data-file=-`.
 * - enforceAppCheck: App Check (docs/design/user-profile.md §8 #3). Rolled out in two steps: the app
 *   sends App Check tokens once `VITE_APP_CHECK_SITE_KEY` is set at build time (src/services/firebase.ts);
 *   only after that build is live and the console shows verified requests does a PR flip this to true.
 *   While false, a request without a token still works.
 */
import { NEO4J_SECRETS } from './neo4j';
import { ownWordsKey } from './crypto';

export const APP_CHECK_ENFORCED = false;

export const FUNCTION_SECRETS = [...NEO4J_SECRETS, ownWordsKey];

export const CALL_OPTS = { secrets: FUNCTION_SECRETS, enforceAppCheck: APP_CHECK_ENFORCED };
