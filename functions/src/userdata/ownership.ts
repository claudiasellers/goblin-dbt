/**
 * Ownership helpers for user-data writes (plan §5.1). Pure: no firebase imports.
 *
 * Writes MERGE on `key = ownerId + ':' + id`, never on `id`, so a client-supplied id is safe: a
 * guessed id from another user yields a different key. Every write callable starts with
 * MERGE_USER so a missing User node is created instead of silently dropping the write (F4).
 */
import type { ManagedTransaction } from 'neo4j-driver';

/** `ownerId:id`, the per-label unique key of every :UserData node. */
export function userKey(uid: string, id: string): string {
  return `${uid}:${id}`;
}

/**
 * Cypher prefix binding `u` to the caller's User, creating it if needed. Params: `$uid`, `$email`
 * (may be null). Use as the first clause of every user-data write.
 */
export const MERGE_USER = `MERGE (u:User {id: $uid})
ON CREATE SET u.createdAt = datetime(), u.email = $email`;

/** Ensure the User node exists inside an open write transaction (for writers that don't inline MERGE_USER). */
export async function mergeUserTx(tx: ManagedTransaction, uid: string, email: string | null): Promise<void> {
  await tx.run(MERGE_USER, { uid, email });
}

