/**
 * Find the feeling: content, sessions, collection.
 * Moved verbatim from the single-file functions/src/index.ts (A1-2); deploy names are the export names.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import neo4j, { Record as Neo4jRecord } from 'neo4j-driver';
import { getDriver, neo4jUri, neo4jUser, neo4jPassword } from '../shared/neo4j';
import { int } from '../shared/values';
import { validateFindTheFeelingSession, checkFindTheFeelingGates, type FindTheFeelingGates } from '../findTheFeelingValidation';

// ============================================
// FIND THE FEELING (Shape it / Tune it)
// ============================================

const FIND_FLOW_VERSION = 'find-v1';

interface FindFlowDoc {
  version: string;
  gates: FindTheFeelingGates & { [k: string]: unknown };
  copy: Record<string, unknown>;
  [k: string]: unknown;
}

function parseFindFlow(raw: unknown): FindFlowDoc {
  let flow: FindFlowDoc | null = null;
  try { flow = typeof raw === 'string' ? JSON.parse(raw) : null; } catch { flow = null; }
  const g = flow?.gates;
  if (!flow || flow.version !== FIND_FLOW_VERSION || !g || !Array.isArray(g.regulateBands) || !Array.isArray(g.activateUrges)
    || typeof g.maxWordsOffered !== 'number' || !Array.isArray(g.floodedBlankRoutes) || !flow.copy) {
    throw new HttpsError('failed-precondition', 'Invalid find-the-feeling flow content');
  }
  return flow;
}

/** Families + signatures, urges + routes, and the flow document. Public therapeutic content. */
async function readFindContent(tx: { run: (q: string, p?: Record<string, unknown>) => Promise<{ records: Neo4jRecord[] }> }) {
  const flowRes = await tx.run(
    `MATCH (f:FindTheFeelingFlow {id: 'find_the_feeling_flow'}) RETURN f.version AS version, f.contentJson AS content`);
  const famRes = await tx.run(
    `MATCH (fam:FeelingFamily)-[i:INCLUDES]->(g:FeelingSignature)<-[:HAS_FEELING_SIGNATURE]-(e:Emotion)
     OPTIONAL MATCH (tc:TherapyConcept)-[:ADDRESSES]->(e) WHERE tc.appToolId IS NOT NULL
     WITH fam, i, g, e, tc ORDER BY tc.appToolId
     WITH fam, i, g, e, collect(DISTINCT tc.appToolId) AS addressedBy
     ORDER BY fam.order, i.offer
     WITH fam, collect({ emotionId: e.id, name: coalesce(e.name, e.id), shape: g.shape, sound: g.sound,
                         offer: i.offer, addressedBy: addressedBy }) AS words
     RETURN fam { .id, .label, .order } AS family, words
     ORDER BY family.order`);
  const urgeRes = await tx.run(
    `MATCH (u:FeelingUrge)
     OPTIONAL MATCH (u)-[r:ROUTES_TO]->(tc:TherapyConcept) WHERE tc.appToolId IS NOT NULL
     WITH u, r, tc ORDER BY r.rank
     RETURN u { .id, .label, .sub, .order } AS urge, [x IN collect(tc.appToolId) WHERE x IS NOT NULL] AS routes
     ORDER BY urge.order`);
  const rec = flowRes.records[0];
  if (!rec || rec.get('version') !== FIND_FLOW_VERSION) {
    throw new HttpsError('failed-precondition', 'Find the feeling content migration is required');
  }
  const flow = parseFindFlow(rec.get('content'));
  const families = famRes.records.map(r => ({
    ...r.get('family'), order: int(r.get('family').order),
    words: (r.get('words') as Array<Record<string, unknown>>).map(w => ({ ...w, offer: int(w.offer) })),
  }));
  const urges = urgeRes.records.map(r => ({ ...r.get('urge'), order: int(r.get('urge').order), routes: r.get('routes') }));
  if (!families.length || urges.length !== 4) throw new HttpsError('failed-precondition', 'Find the feeling content is incomplete');
  return { flow, families, urges };
}

export const getFindTheFeelingContent = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async () => {
    const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
    try {
      const { flow, families, urges } = await session.executeRead(tx => readFindContent(tx));
      return { version: FIND_FLOW_VERSION, flow, families, urges, floodedBlankRoutes: flow.gates.floodedBlankRoutes };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('getFindTheFeelingContent failed', (error as { code?: string })?.code ?? 'unknown');
      throw new HttpsError('internal', 'Failed to get find-the-feeling content');
    } finally { await session.close(); }
  }
);

/**
 * Explicit save. Words and routes are checked against the graph; the clinical gates are re-checked
 * from the same flow document the client used. Accepted words join the user's collection (FOUND_WORD).
 */
export const saveFindTheFeelingSession = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to save');
    let data: ReturnType<typeof validateFindTheFeelingSession>;
    try { data = validateFindTheFeelingSession(request.data); }
    catch { throw new HttpsError('invalid-argument', 'Invalid session'); }
    const userId = request.auth.uid;
    const key = `${userId}:${data.id}`;
    const session = getDriver().session();
    try {
      await session.executeWrite(async tx => {
        if (data.contentVersion !== FIND_FLOW_VERSION) throw new HttpsError('failed-precondition', 'Content changed; start again');
        const { flow, families, urges } = await readFindContent(tx);
        if (checkFindTheFeelingGates(data, flow.gates)) throw new HttpsError('invalid-argument', 'Session does not match the protocol');
        const words = families.flatMap(f => f.words as Array<{ emotionId: string; addressedBy: string[] }>);
        const known = new Set(words.map(w => w.emotionId));
        if (!data.offered.every(w => known.has(w))) throw new HttpsError('failed-precondition', 'Content changed; start again');
        const allowed = new Set<string>(flow.gates.floodedBlankRoutes);
        for (const w of words) for (const t of w.addressedBy) allowed.add(t);
        for (const u of urges) for (const t of u.routes as string[]) allowed.add(t);
        if (!data.routedTo.every(t => allowed.has(t))) throw new HttpsError('invalid-argument', 'Invalid session');

        const written = await tx.run(
          `MATCH (f:FindTheFeelingFlow {id: 'find_the_feeling_flow'})
           MERGE (u:User {id: $userId})
           CREATE (s:FindTheFeelingSession {key: $key})
           SET s:UserData:LogRecord, s.id = $id, s.ownerId = $userId, s.schemaVersion = 1,
               s.createdAt = datetime(), s.contentVersion = $contentVersion, s.entry = $entry,
               s.way = $way, s.band = $band, s.pull = $pull, s.regulation = $regulation, s.word = $word,
               s.close = $close, s.ambientDescent = $ambientDescent, s.dataJson = $dataJson
           CREATE (u)-[:COMPLETED_SESSION]->(s), (s)-[:USED_FLOW]->(f)
           WITH u, s
           OPTIONAL MATCH (e:Emotion {id: $word})
           FOREACH (ee IN CASE WHEN e IS NULL THEN [] ELSE [e] END |
             CREATE (s)-[:FOUND]->(ee)
             MERGE (u)-[fw:FOUND_WORD]->(ee)
             ON CREATE SET fw.firstAt = datetime(), fw.count = 0, fw.ways = []
             SET fw.lastAt = datetime(), fw.count = fw.count + 1,
                 fw.ways = CASE WHEN $way IN fw.ways THEN fw.ways ELSE fw.ways + $way END)
           RETURN count(DISTINCT s) AS created`,
          {
            userId, key, id: data.id, contentVersion: data.contentVersion, entry: data.entry, way: data.way,
            band: data.band, pull: data.pull, regulation: data.regulation, word: data.word, close: data.close,
            ambientDescent: data.ambientDescent, dataJson: JSON.stringify(data),
          }
        );
        if (int(written.records[0]?.get('created')) !== 1) throw new HttpsError('failed-precondition', 'Content changed; start again');
      });
      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      const code = (error as { code?: string })?.code;
      if (code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
        throw new HttpsError('already-exists', 'This session is already saved');
      }
      console.error('saveFindTheFeelingSession failed', code ?? 'unknown'); // error code only, never the payload
      throw new HttpsError('internal', 'Could not save');
    } finally { await session.close(); }
  }
);

/** The user's word collection (shelf / strings), with each word's signature for rendering. */
export const getFeelingCollection = onCall(
  { secrets: [neo4jUri, neo4jUser, neo4jPassword] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to see your collection');
    const session = getDriver().session({ defaultAccessMode: neo4j.session.READ });
    try {
      const res = await session.executeRead(tx => tx.run(
        `MATCH (:User {id: $userId})-[fw:FOUND_WORD]->(e:Emotion)
         OPTIONAL MATCH (e)-[:HAS_FEELING_SIGNATURE]->(g:FeelingSignature)
         RETURN e.id AS emotionId, coalesce(e.name, e.id) AS name, g.shape AS shape, g.sound AS sound,
                fw.count AS count, fw.ways AS ways, toString(fw.firstAt) AS firstAt
         ORDER BY fw.firstAt`, { userId: request.auth!.uid }));
      return {
        words: res.records.map(r => ({
          emotionId: r.get('emotionId'), name: r.get('name'), shape: r.get('shape') ?? null, sound: r.get('sound') ?? null,
          count: int(r.get('count')), ways: r.get('ways') ?? [], firstAt: r.get('firstAt'),
        })),
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('getFeelingCollection failed', (error as { code?: string })?.code ?? 'unknown');
      throw new HttpsError('internal', 'Could not load your collection');
    } finally { await session.close(); }
  }
);
