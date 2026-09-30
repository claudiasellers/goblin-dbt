/**
 * Witness voice (WMP-01, plan A5-2): serve validation lines for a beat, and log what the beat did.
 *
 * getWitnessLines (public): live ValidationLine candidates for the moment, band and words, ranked
 * by ./rank.ts. Signed in, it also reads the user's own and saved lines through the profile layer's
 * server-side reader (readProfileSlices(tx, uid, 'witness'), R16) and their SHOWED_LINE history
 * (rotation, landed-first, fade stage, whether to ask "Did that land?").
 *
 * recordWitnessBeat (auth): the host record must be the caller's. SHOWED_LINE edges are the log of
 * record (R17) and follow the host's lifecycle (a finalised check-in takes no new edges, R2). An
 * OwnLine ("say it my way") and SAVED_LINE ("keep") are profile writes the user made, so they are
 * written whatever the host's state, and bump User.profileVersion.
 */
import neo4j, { type ManagedTransaction } from 'neo4j-driver';
import { HttpsError } from 'firebase-functions/v2/https';
import { callable } from '../shared/callable';
import { readTx, writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { int } from '../shared/values';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { readProfileSlices } from '../profile/slices';
import { askLandedOf, fadeStageOf, rankWitnessLines, type GraphCandidate, type OwnCandidate, type UserHistory } from './rank';
import { parseGetWitnessLines, parseRecordWitnessBeat } from './validation';
import {
  LEVELS_BY_BAND, WITNESS_VERSION,
  type GetWitnessLinesResponse, type LineKind, type RecordWitnessBeatResponse, type WitnessLevel,
} from './types';

/** Live candidates for one beat (E3 §A5.4); rank.ts finishes the ordering. */
export const CANDIDATES_QUERY = `
OPTIONAL MATCH (e:Emotion)-[:HAS_REGULATION_CONTENT]->(fc:EmotionRegulationContent) WHERE e.id IN $emotionIds
WITH collect(DISTINCT fc.dbtParent) AS parents
MATCH (l:ValidationLine {status: 'live'})
WHERE coalesce(l.forOther, false) = $forOther AND $band IN l.bands AND l.level IN $levels
  AND (NOT EXISTS { (l)-[:FOR_MOMENT]->() } OR EXISTS { (l)-[:FOR_MOMENT]->(:ToolMoment {id: $moment}) })
OPTIONAL MATCH (l)-[:FOR_SITUATION]->(s) WHERE s.id = $situationId
OPTIONAL MATCH (l)-[:FOR_URGE]->(u:ActionUrge {id: $urgeId})
OPTIONAL MATCH (l)-[:VALIDATES]->(w:Emotion) WHERE w.id IN $emotionIds
OPTIONAL MATCH (l)-[:VALIDATES_FAMILY]->(f:EmotionRegulationContent) WHERE f.dbtParent IN parents
OPTIONAL MATCH (l)-[:UNDERNEATH]->(un:Emotion)
WITH l, count(DISTINCT s) AS sit, count(DISTINCT u) AS urg, count(DISTINCT w) AS word, count(DISTINCT f) AS fam,
     head(collect(DISTINCT un.id)) AS underneath,
     EXISTS { (l)-[:VALIDATES|VALIDATES_FAMILY|FOR_SITUATION|FOR_URGE]->() } AS targeted
WHERE sit + urg + word + fam > 0 OR NOT targeted
RETURN l {.id, .text, .textNamed, .level, .kind, .voice, .tentative, .order} AS line, underneath,
       CASE WHEN sit > 0 THEN 4 WHEN urg > 0 THEN 3 WHEN word > 0 THEN 2 WHEN fam > 0 THEN 1 ELSE 0 END AS specificity`;

/** The user's beat history (aggregates over their own host records only). */
export const HISTORY_QUERY = `
MATCH (:User {id: $uid})-[:LOGGED|HAS_TOOL_SESSION]->(h)-[s:SHOWED_LINE]->(l:ValidationLine)
WHERE h:CheckIn OR h:ToolSession
RETURN count(DISTINCT h) AS serves, count(s.landed) AS answers,
       collect(CASE WHEN s.landed = 'yes' THEN l.id END) AS landedYes`;

export const RECENT_QUERY = `
MATCH (:User {id: $uid})-[:LOGGED|HAS_TOOL_SESSION]->(h)-[s:SHOWED_LINE]->(l:ValidationLine)
WHERE h:CheckIn OR h:ToolSession
WITH h, max(s.at) AS at, collect(l.id) AS ids
ORDER BY at DESC LIMIT 3
RETURN collect(ids) AS recent`;

function candidateFrom(line: Record<string, unknown>, underneath: unknown, specificity: unknown): GraphCandidate {
  return {
    id: String(line.id),
    text: String(line.text ?? ''),
    textNamed: (line.textNamed as string | null) ?? null,
    level: int(line.level) as WitnessLevel,
    kind: (line.kind as LineKind) ?? 'receive',
    voice: (line.voice as GraphCandidate['voice']) ?? 'none',
    tentative: line.tentative === true,
    order: line.order == null ? 0 : int(line.order),
    underneath: (underneath as string | null) ?? null,
    specificity: int(specificity),
  };
}

async function readHistory(tx: ManagedTransaction, uid: string, own: Array<{ uses: number }>, savedIds: string[]): Promise<UserHistory> {
  const h = (await tx.run(HISTORY_QUERY, { uid })).records[0];
  const r = (await tx.run(RECENT_QUERY, { uid })).records[0];
  return {
    serves: h ? int(h.get('serves')) : 0,
    answers: h ? int(h.get('answers')) : 0,
    landedYes: h ? ((h.get('landedYes') as Array<string | null>).filter(Boolean) as string[]) : [],
    recentIds: r ? (r.get('recent') as string[][]).flat() : [],
    savedIds,
    ownLineCount: own.length,
    ownLineUses: own.reduce((n, o) => n + (o.uses || 0), 0),
  };
}

export const getWitnessLines = callable<unknown, GetWitnessLinesResponse>(
  { auth: 'public', label: 'getWitnessLines', errorMessage: 'Could not load that' },
  async ({ uid, data }) => {
    const req = parseOrInvalid(() => parseGetWitnessLines(data), 'Invalid request');
    return readTx(async (tx) => {
      const res = await tx.run(CANDIDATES_QUERY, {
        emotionIds: req.emotionIds, forOther: req.forOther, band: req.band, moment: req.moment,
        levels: LEVELS_BY_BAND[req.band].map((l) => neo4j.int(l)),
        situationId: req.situationId, urgeId: req.urgeId,
      });
      const candidates = res.records.map((r) => candidateFrom(r.get('line'), r.get('underneath'), r.get('specificity')));
      let history: UserHistory | null = null;
      let own: OwnCandidate[] = [];
      let firstName: string | null = null;
      if (uid) {
        const slices = await readProfileSlices(tx, uid, 'witness');
        firstName = slices.name.firstName;
        own = slices.ownLines.map((o) => ({
          id: o.id, text: o.text, emotionIds: o.emotionIds, situationId: o.situationId, moment: o.moment, lastUsedAt: o.lastUsedAt,
        }));
        history = await readHistory(tx, uid, slices.ownLines, slices.savedLines.map((s) => s.lineId));
      }
      const lines = rankWitnessLines({
        band: req.band, moment: req.moment, emotionIds: req.emotionIds, situationId: req.situationId,
        candidates, own, history, excludeIds: req.excludeIds, max: req.max,
      });
      return {
        version: WITNESS_VERSION,
        fadeStage: fadeStageOf(history),
        askLanded: askLandedOf(req.band, history),
        firstName,
        lines,
      };
    });
  },
);

const HOSTS = {
  checkin: { label: 'CheckIn', rel: 'LOGGED', guard: GUARDS.CheckIn.upsert('h') },
  tool_session: { label: 'ToolSession', rel: 'HAS_TOOL_SESSION', guard: GUARDS.ToolSession.showLine('h') },
} as const;

export const recordWitnessBeat = callable<unknown, RecordWitnessBeatResponse>(
  { auth: 'required', label: 'recordWitnessBeat', errorMessage: 'Could not save that' },
  async ({ uid, data, request }) => {
    const req = parseOrInvalid(() => parseRecordWitnessBeat(data), 'Invalid request');
    const host = HOSTS[req.hostKind];
    const hostKey = userKey(uid as string, req.hostId);
    return writeTx(async (tx) => {
      // Ownership: the host is found through the caller's own User node, by key (never by id alone).
      const found = await tx.run(
        `${MERGE_USER}
         WITH u
         OPTIONAL MATCH (u)-[:${host.rel}]->(h:${host.label} {key: $hostKey})
         RETURN h IS NOT NULL AS found, CASE WHEN h IS NULL THEN false ELSE ${host.guard} END AS writable`,
        { uid, email: request.auth?.token?.email ?? null, hostKey },
      );
      const rec = found.records[0];
      if (!rec || rec.get('found') !== true) throw new HttpsError('not-found', 'Not found');
      const logged = rec.get('writable') === true;
      const out: RecordWitnessBeatResponse = { logged };

      if (logged && req.shown.length) {
        await tx.run(
          `MATCH (:User {id: $uid})-[:${host.rel}]->(h:${host.label} {key: $hostKey})
           WHERE ${host.guard}
           UNWIND $shown AS s
           MATCH (l:ValidationLine {id: s.lineId})
           MERGE (h)-[r:SHOWED_LINE]->(l)
           ON CREATE SET r.at = datetime(), r.moment = $moment, r.level = l.level, r.band = $band
           SET r.landed = coalesce(r.landed, s.landed),
               r.skipped = coalesce(r.skipped, false) OR $skipped,
               r.noneFit = coalesce(r.noneFit, false) OR $noneFit`,
          { uid, hostKey, shown: req.shown, moment: req.moment, band: req.band, skipped: req.skipped, noneFit: req.noneFit },
        );
      }

      if (req.ownLineShownId) {
        // Counted once per host record, so a retried call doesn't double-count.
        await tx.run(
          `MATCH (:User {id: $uid})-[:HAS_OWN_LINE]->(o:OwnLine {key: $ownKey})
           WHERE coalesce(o.lastHostKey, '') <> $hostKey
           SET o.uses = coalesce(o.uses, 0) + 1, o.lastUsedAt = datetime(), o.lastHostKey = $hostKey`,
          { uid, ownKey: userKey(uid as string, req.ownLineShownId), hostKey },
        );
      }

      let profileWrite = false;
      if (req.ownLine) {
        await tx.run(
          `MATCH (u:User {id: $uid})
           MERGE (o:OwnLine {key: $key})
           ON CREATE SET o:UserData:ProfileItem, o.id = $id, o.ownerId = $uid, o.kind = 'own_line', o.area = 'my_words',
                         o.status = 'active', o.source = 'witness', o.createdAt = datetime(), o.confirmedAt = datetime(),
                         o.schemaVersion = 1, o.text = $text, o.emotionIds = $emotionIds, o.situationId = $situationId,
                         o.moment = $moment, o.uses = 0
           MERGE (u)-[:HAS_OWN_LINE]->(o)`,
          {
            uid, key: userKey(uid as string, req.ownLine.id), id: req.ownLine.id, text: req.ownLine.text,
            emotionIds: req.ownLine.emotionIds, situationId: req.ownLine.situationId ?? null, moment: req.moment,
          },
        );
        out.ownLineId = req.ownLine.id;
        profileWrite = true;
      }

      if (req.keepLineId) {
        const kept = await tx.run(
          `MATCH (u:User {id: $uid}), (l:ValidationLine {id: $lineId, status: 'live'})
           MERGE (u)-[k:SAVED_LINE]->(l)
           ON CREATE SET k.confirmedAt = datetime(), k.source = 'witness_keep'
           SET k.lastAt = datetime()
           RETURN l.id AS id`,
          { uid, lineId: req.keepLineId },
        );
        if (kept.records.length) profileWrite = true;
      }

      if (profileWrite) {
        const v = await tx.run(
          `MATCH (u:User {id: $uid}) SET u.profileVersion = coalesce(u.profileVersion, 0) + 1 RETURN u.profileVersion AS version`,
          { uid },
        );
        const version = v.records[0]?.get('version');
        if (version != null) out.profileVersion = int(version);
      }
      return out;
    });
  },
);
