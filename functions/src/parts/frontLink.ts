/**
 * Meet a part's 5d ("Does it stand in front of another part you know?"): the thread it draws, written
 * server-side from the stored session, never from client fields: `covers_for`, this visit's part in front
 * of the part picked. Through links.ts' writePartLink (the one PartLink writer), in the caller's own
 * transaction. A link the checks refuse (that part set aside since, parts off) is simply not drawn: the
 * visit's own write never fails for it.
 */
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { writePartLink } from './links';

export type FrontLinkWriter = (frontId: string, behindId: string) => Promise<boolean>;

export function frontLinkWriter(tx: ManagedTransaction, uid: string): FrontLinkWriter {
  return async (frontId, behindId) => {
    try {
      await writePartLink(tx, uid, { kind: 'covers_for', aId: frontId, bId: behindId });
      return true;
    } catch (e) {
      if (e instanceof HttpsError) return false;
      throw e;
    }
  };
}
