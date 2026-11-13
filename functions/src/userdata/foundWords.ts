import type { ManagedTransaction } from 'neo4j-driver';

/**
 * Words everywhere (ER-10 part 3, `docs/design/emotion-guide.md`): every save that records an accepted word adds it
 * to the person's words, `(:User)-[:FOUND_WORD]->(:Emotion)`, a log aggregate (D-10, `layers.ts`
 * `LOG_AGGREGATE_EDGES`): it accumulates without a yes, Me shows it read-only, export and delete cover it.
 *
 * Once per record and word: the record gets a `FOUND` edge to the word the first time, and only a new `FOUND` edge
 * counts, so an upsert (the check-in's re-saves) or a replayed close never counts a word twice. `sources` says which
 * saves found it: `checkin`, or the tool id (`find-the-feeling`, `invalidation-recovery`, `opposite-action`, …).
 * Find the feeling's save writes its own (with its `ways`); `foundWordsSource` keeps the close from counting it again.
 */

/** The records that can find words, each reached from the User by its ownership edge (never by a bare key). */
const RECORDS = {
  CheckIn: 'LOGGED',
  ToolSession: 'HAS_TOOL_SESSION',
} as const;

export type FoundWordRecord = keyof typeof RECORDS;

/** Tools whose own save writes FOUND_WORD: their close doesn't. */
export const OWN_FOUND_WORD_SAVE: readonly string[] = ['find-the-feeling'];

/** The source a tool's close records its picked words under, or null when its own save already does. */
export function foundWordsSource(toolId: string): string | null {
  return OWN_FOUND_WORD_SAVE.includes(toolId) ? null : toolId;
}

/** The Cypher, exported for the pins. `$ids` are de-duplicated; unknown ids match no Emotion and are dropped. */
export function foundWordsQuery(label: FoundWordRecord): string {
  return `MATCH (u:User {id: $uid})-[:${RECORDS[label]}]->(r:${label} {key: $key})
     UNWIND $ids AS eid
     MATCH (e:Emotion {id: eid})
     WHERE NOT (r)-[:FOUND]->(e)
     CREATE (r)-[:FOUND]->(e)
     MERGE (u)-[fw:FOUND_WORD]->(e)
     ON CREATE SET fw.firstAt = datetime(), fw.count = 0, fw.ways = [], fw.sources = []
     SET fw.lastAt = datetime(), fw.count = fw.count + 1,
         fw.sources = CASE WHEN $source IN coalesce(fw.sources, []) THEN fw.sources
                           ELSE coalesce(fw.sources, []) + $source END`;
}

/** Add the record's accepted words to the person's words (nothing when there are none). */
export async function recordFoundWords(
  tx: ManagedTransaction, uid: string, label: FoundWordRecord, key: string, ids: readonly string[], source: string,
): Promise<void> {
  const unique = [...new Set(ids.filter((x) => typeof x === 'string' && x.length > 0))];
  if (!unique.length) return;
  await tx.run(foundWordsQuery(label), { uid, key, ids: unique, source });
}
