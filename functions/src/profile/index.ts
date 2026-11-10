/**
 * The profile layer (PR-P1): the single read path, item writes, pattern offers, the Me surface.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { obj, str } from '../shared/validate';
import { readProfileSlices, readProfileVersion } from './slices';
import { PROFILE_NEEDS, SERVER_ONLY_CONSUMERS, type GetProfileContextResponse, type ProfileConsumer } from './types';

export {
  upsertProfileFact, keepProfileItem, editProfileItem, deleteProfileItem, confirmProfileItem, setAsideProfileItem, restoreProfileItem,
} from './items';
export { answerPatternOffer } from './patternOffers';
export { getMe } from './me';

/**
 * getProfileContext(toolId): only the slices the tool declared (PROFILE_NEEDS), in one read
 * transaction, plus User.profileVersion for the client's in-memory cache. Unknown and server-only
 * consumers are rejected.
 */
export const getProfileContext = callable<unknown, GetProfileContextResponse>(
  { auth: 'required', label: 'getProfileContext', errorMessage: 'Could not load that' },
  async ({ uid, data }) => {
    const toolId = parseOrInvalid(() => str(obj(data).toolId, { max: 64 }), 'Unknown tool');
    if (!Object.prototype.hasOwnProperty.call(PROFILE_NEEDS, toolId) || SERVER_ONLY_CONSUMERS.includes(toolId as ProfileConsumer)) {
      throw new HttpsError('invalid-argument', 'Unknown tool');
    }
    const consumer = toolId as ProfileConsumer;
    return readTx(async (tx) => ({
      toolId: consumer,
      version: await readProfileVersion(tx, uid as string),
      slices: await readProfileSlices(tx, uid as string, consumer),
    }));
  },
);
