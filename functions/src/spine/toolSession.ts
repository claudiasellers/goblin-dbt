/**
 * ToolSession + SkillPractice + compat ToolUsage (PR-S3; E2 §A3.2, R15, R18, R19).
 *
 * - startToolSession: written at mount, status 'open' (R19). Idempotent by key (StrictMode double
 *   effects are harmless). Links FROM_CHECKIN / HANDED_OFF_FROM / RESOLVING and creates the compat
 *   ToolUsage once (replacing trackToolUsage at the same moment), FOLLOWED_CHECKIN to the given
 *   check-in, else the latest one before now.
 * - closeToolSession: accepted while open, whatever its age (finalise-once, R2). Stores the close
 *   answer (canonical then-vs-now + direction, R3), links the tool's own detail node, writes one
 *   SkillPractice per skill (completed, or exited early after the skill step began), and sets the
 *   compat ToolUsage outcome once. A replay returns the existing ids.
 * - recordToolSession: both in one transaction, for one-shots (micro-step, guided activity,
 *   help-now, FTF inside the check-in).
 */
import { encryptExtOwn } from './extOwn';
import { HttpsError } from 'firebase-functions/v2/https';
import type { ManagedTransaction } from 'neo4j-driver';
import { callable } from '../shared/callable';
import { writeTx } from '../shared/neo4j';
import { parseOrInvalid } from '../shared/errors';
import { GUARDS } from '../userdata/lifecycle';
import { MERGE_USER, userKey } from '../userdata/ownership';
import { USER_DATA } from '../userdata/layers';
import { legacyOutcome, readingProps } from '../capacity/reading';
import { FITS_FACTS_TOOLS, validateAnswer, validateClose, validateRecord, validateStart, type CloseInput, type StartInput } from './validation';
import { URGE_KINDS, type CloseKind, type DetailKind } from './types';
import { scheduleTx } from './followUp';
import { NOT_WHAT_HELPS } from './tools';
import { projectRun, runRep } from '../skills/projections';

/** Deep-link follow-ups that opening resolves: the resume link, the nightmare read-through, Ending's check-ins (IE-08), Problem Solve's review (ER-12) and DEAR MAN's "How did it go?" (IE-B2). */
export const OPEN_RESOLVES = ['resume_skill', 'nightmare_rehearse', 'ending_after', 'ending_again', 'ending_revisit', 'hold_come_back', 'ps_review', 'ask_outcome', 'no_outcome', 'oa_try'] as const;

/** Detail node labels by kind (a whitelist: the label is interpolated into Cypher). */
export const DETAIL_LABELS: Record<DetailKind, string> = {
  opposite_action: 'OppositeActionSession',
  invalidation_recovery: 'InvalidationRecoverySession',
  dear_man: 'DearManSession',
  find_the_feeling: 'FindTheFeelingSession',
  meet_a_part: 'PartSession',
  two_pulls: 'PullsSession',
};

/** The User → detail ownership rels (COMPLETED_SESSION for the four wrapped tools, HAS_PART_SESSION, HAS_PULLS_SESSION). */
const DETAIL_RELS = [...new Set(Object.values(DETAIL_LABELS).map((l) => USER_DATA[l].rel))].join('|');

/** Patterns whose reps are flagged blank / dissociated (E2 §A3.2). */
export const BLANK_PATTERNS = ['conservation_freeze', 'dissociation_overmodulation', 'reward_drive_low'];

export interface StartToolSessionResponse { id: string; toolUsageId: string }
export interface CloseToolSessionResponse { id: string; skillPracticeIds: string[]; followUpIds: string[] }

async function startTx(tx: ManagedTransaction, uid: string, email: string | null, s: StartInput): Promise<string> {
  const k = (id: string | null) => (id ? userKey(uid, id) : null);
  const band = readingProps('bandAtStart', s.bandAtStart);
  const res = await tx.run(
    `${MERGE_USER}
     MERGE (ts:ToolSession {key: $key})
     ON CREATE SET ts:UserData:LogRecord, ts.id = $id, ts.ownerId = $uid, ts.createdAt = datetime(), ts.schemaVersion = 1,
       ts.toolId = $toolId, ts.module = $module, ts.closeKind = $closeKind, ts.flowVersion = $flowVersion,
       ts.entry = $entry, ts.startedAt = datetime(), ts.status = 'open', ts.practiced = false,
       ts.patternId = $patternId, ts.emotionIds = $emotionIds,
       ts.bandAtStart = $bandAtStart, ts.bandAtStartSource = $bandAtStartSource,
       ts.bandAtStartViaCantTell = $bandAtStartViaCantTell,
       ts.bandAtStartAt = CASE WHEN $bandAtStartAt IS NULL THEN null ELSE datetime($bandAtStartAt) END,
       ts.bandAtStartJson = $bandAtStartJson, ts.checkInId = $checkInId
     MERGE (u)-[:HAS_TOOL_SESSION]->(ts)
     WITH u, ts
     // A check-in that embedded this session (FTF inside the check-in) and was saved first.
     OPTIONAL MATCH (u)-[:LOGGED]->(ec:CheckIn) WHERE $id IN coalesce(ec.embeddedToolSessionIds, [])
     FOREACH (x IN CASE WHEN ec IS NULL THEN [] ELSE [ec] END | MERGE (x)-[:EMBEDDED]->(ts))
     WITH DISTINCT u, ts
     OPTIONAL MATCH (u)-[:LOGGED]->(c:CheckIn {key: $checkInKey})
     OPTIONAL MATCH (u)-[:HAS_TOOL_SESSION]->(h:ToolSession {key: $hostKey})
     OPTIONAL MATCH (u)-[:HAS_FOLLOW_UP]->(f:FollowUp {key: $followUpKey})
     FOREACH (x IN CASE WHEN c IS NULL THEN [] ELSE [c] END | MERGE (ts)-[:FROM_CHECKIN]->(x))
     FOREACH (x IN CASE WHEN h IS NULL OR h = ts THEN [] ELSE [h] END | MERGE (ts)-[:HANDED_OFF_FROM]->(x))
     FOREACH (x IN CASE WHEN f IS NULL THEN [] ELSE [f] END | MERGE (ts)-[:RESOLVING]->(x))
      // Opening a "come back to this later" link is the resolution (Codex, PR #17), and so is opening a
      // nightmare read-through (ER-15), a Problem Solve review (ER-12), Hold to wait's come-back (DT-02) or one of Ending's check-ins (IE-08) once
      // its visit saves; other deep-link types are resolved by their own tool (oa_plan by Opposite Action).
      FOREACH (x IN CASE WHEN f IS NOT NULL AND f.type IN $openResolves AND ${GUARDS.FollowUp.update('f')} THEN [f] ELSE [] END |
       SET x.status = 'done', x.resolvedAt = datetime(), x.updatedAt = datetime())
     WITH u, ts
     MERGE (tu:ToolUsage {key: $usageKey})
     ON CREATE SET tu:UserData:LogRecord, tu.id = $usageId, tu.ownerId = $uid, tu.toolId = $toolId,
       tu.timestamp = datetime(), tu.createdAt = datetime(), tu.schemaVersion = 1, tu.toolSessionId = $id
     MERGE (u)-[:USED_TOOL]->(tu)
     MERGE (ts)-[:COMPAT_USAGE]->(tu)
     RETURN tu.id AS toolUsageId`,
    {
      uid, email, key: userKey(uid, s.id), id: s.id, toolId: s.toolId, module: s.module, closeKind: s.closeKind,
      flowVersion: s.flowVersion, entry: s.entry, patternId: s.patternId, emotionIds: s.emotionIds, ...band,
      checkInId: s.checkInId ?? null, checkInKey: k(s.checkInId), hostKey: k(s.hostSessionId), followUpKey: k(s.followUpId),
      usageKey: userKey(uid, `${s.id}:usage`), usageId: `${s.id}:usage`, openResolves: OPEN_RESOLVES,
    },
  );
  // The compat row follows the check-in it came from (F6), else the latest one before now, once.
  // When the session names a check-in that isn't saved yet (the render save still in flight), it
  // waits: saveCheckIn links it (never the previous check-in by mistake; Codex, PR #16).
  await tx.run(
    `MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})-[:COMPAT_USAGE]->(tu:ToolUsage)
     WHERE NOT (tu)-[:FOLLOWED_CHECKIN]->()
     OPTIONAL MATCH (ts)-[:FROM_CHECKIN]->(given:CheckIn)
     OPTIONAL MATCH (u)-[:LOGGED]->(latest:CheckIn)
       WHERE given IS NULL AND ts.checkInId IS NULL AND latest.timestamp <= tu.timestamp AND latest.quadrant IS NOT NULL
     WITH tu, given, latest ORDER BY latest.timestamp DESC LIMIT 1
     WITH tu, coalesce(given, latest) AS link
     FOREACH (x IN CASE WHEN link IS NULL THEN [] ELSE [link] END | MERGE (tu)-[:FOLLOWED_CHECKIN]->(x))`,
    { uid, key: userKey(uid, s.id) },
  );
  return res.records[0]?.get('toolUsageId') as string;
}

/** Close an open session (no-op + existing ids when already closed). Returns rep and follow-up ids. */
async function closeTx(tx: ManagedTransaction, uid: string, c: CloseInput): Promise<{ reps: string[]; followUps: string[] }> {
  const key = userKey(uid, c.id);
  const head = await tx.run(
    `MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
     OPTIONAL MATCH (ts)-[:LOGGED_REP]->(sp:SkillPractice)
     WITH ts, collect(sp.id) AS reps
     OPTIONAL MATCH (ts)-[:SCHEDULED]->(f:FollowUp)
     RETURN ${GUARDS.ToolSession.close('ts')} AS open, ts.closeKind AS closeKind, ts.practiced AS practiced,
            ts.toolId AS toolId, reps, collect(f.id) AS followUps`,
    { uid, key },
  );
  const rec = head.records[0];
  if (!rec) throw new HttpsError('not-found', 'Session not found');
  if (rec.get('open') !== true) return { reps: rec.get('reps') as string[], followUps: rec.get('followUps') as string[] };
  const closeKind = rec.get('closeKind') as CloseKind;
  // An answer the tool doesn't ask is dropped (the stored closeKind is authoritative).
  const dir = closeKind === 'regulation_down' || closeKind === 'urge_change' ? 'down' : closeKind === 'orienting' ? 'orient' : null;
  const thenVsNow = dir ? c.thenVsNow : null;
  const actedOnUrge = URGE_KINDS.includes(closeKind) ? c.actedOnUrge : null;
  const answered = Boolean(thenVsNow || actedOnUrge);
  const detailLabel = c.detail ? DETAIL_LABELS[c.detail.kind] : null;
  // Own words in ext are stored encrypted (spine/extOwn.ts); their length was checked on the plaintext.
  const ext = await encryptExtOwn(tx, uid, c.ext);
  // An answer already given in Today (an abandoned session answered before its late close) is final
  // (R2): the close never overwrites it. answeredAt is set last, so the items before it read the old value.
  await tx.run(
    `MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
     WHERE ${GUARDS.ToolSession.close('ts')}
     SET ts.status = $status, ts.endedAt = datetime(), ts.exitStep = $exitStep,
         ts.practiced = coalesce(ts.practiced, false) OR $practiced,
         ts.thenVsNow = CASE WHEN ts.answeredAt IS NULL THEN $thenVsNow ELSE ts.thenVsNow END,
         ts.thenVsNowDir = CASE WHEN ts.answeredAt IS NULL THEN $thenVsNowDir ELSE ts.thenVsNowDir END,
         ts.actedOnUrge = CASE WHEN ts.answeredAt IS NULL THEN $actedOnUrge ELSE ts.actedOnUrge END,
         ts.answeredAt = CASE WHEN ts.answeredAt IS NULL AND $answered THEN datetime() ELSE ts.answeredAt END,
         ts.urgeIds = $urgeIds, ts.durationSec = $durationSec, ts.ext = $ext, ts.updatedAt = datetime(),
         ts.wiseMindAnswer = $wiseMindAnswer, ts.fitsFacts = $fitsFacts,
         // Emotions picked inside the tool: set once, never over a hand-off's ids from the start.
         ts.emotionIds = CASE WHEN size(coalesce(ts.emotionIds, [])) = 0 AND size($emotionIds) > 0
                              THEN $emotionIds ELSE ts.emotionIds END
     FOREACH (_ IN CASE WHEN $bandAtEnd IS NULL THEN [] ELSE [1] END |
       SET ts.bandAtEnd = $bandAtEnd, ts.bandAtEndSource = $bandAtEndSource, ts.bandAtEndViaCantTell = $bandAtEndViaCantTell,
           ts.bandAtEndAt = datetime($bandAtEndAt), ts.bandAtEndJson = $bandAtEndJson)
     FOREACH (_ IN CASE WHEN $bandAtStart IS NULL OR ts.bandAtStart IS NOT NULL THEN [] ELSE [1] END |
       SET ts.bandAtStart = $bandAtStart, ts.bandAtStartSource = $bandAtStartSource, ts.bandAtStartViaCantTell = $bandAtStartViaCantTell,
           ts.bandAtStartAt = datetime($bandAtStartAt), ts.bandAtStartJson = $bandAtStartJson)
     WITH u, ts
     OPTIONAL MATCH (u)-[:${DETAIL_RELS}]->(d {key: $detailKey})
       WHERE $detailLabel IS NOT NULL AND $detailLabel IN labels(d)
     FOREACH (x IN CASE WHEN d IS NULL THEN [] ELSE [d] END | MERGE (ts)-[:DETAIL]->(x))
     WITH DISTINCT ts
     OPTIONAL MATCH (ts)-[:COMPAT_USAGE]->(tu:ToolUsage) WHERE ${GUARDS.ToolUsage.outcome('tu')}
     FOREACH (x IN CASE WHEN tu IS NULL OR $legacyOutcome IS NULL THEN [] ELSE [tu] END |
       SET x.outcome = $legacyOutcome, x.outcomeTimestamp = datetime())`,
    {
      uid, key, status: c.status, exitStep: c.exitStep, practiced: c.practiced,
      thenVsNow, thenVsNowDir: thenVsNow ? dir : null, actedOnUrge, answered,
      urgeIds: c.urgeIds, emotionIds: c.emotionIds, durationSec: c.durationSec, ext, ...readingProps('bandAtEnd', c.bandAtEnd),
      // Ask-fresh, on the log record only (layers.ts ASK_FRESH_FIELDS); another tool's is dropped.
      wiseMindAnswer: rec.get('toolId') === 'wise-mind' ? c.wiseMindAnswer : null,
      fitsFacts: FITS_FACTS_TOOLS.includes(rec.get('toolId') as string) ? c.fitsFacts : null,
      ...readingProps('bandAtStart', c.bandAtStart),
      detailKey: c.detail ? userKey(uid, c.detail.id) : null, detailLabel,
      // A "more here" close is not "it helped": no compat outcome for those tools.
      legacyOutcome: NOT_WHAT_HELPS.includes(rec.get('toolId') as string) ? null : legacyOutcome(thenVsNow),
    },
  );
  // A tool on the skill player whose old record still has readers writes it here, from the plaintext run (R14).
  await projectRun(tx, uid, c.id, rec.get('toolId') as string, c.ext);
  const followUps = await scheduleTx(tx, uid, c.schedule, { sourceSessionId: c.id, sourceToolId: rec.get('toolId') as string });
  const practiced = rec.get('practiced') === true || c.practiced;
  // A skill whose rep is something done off the phone (DEAR MAN's debrief): self-reported when it happened, else none.
  const rep = runRep(c.ext, rec.get('toolId') as string);
  if (rep && 'noRep' in rep) return { reps: [], followUps };
  const repSource = rep ? rep.repSource : c.repSource;
  if ((c.status !== 'completed' && !practiced) || (c.skillIds !== null && c.skillIds.length === 0)) return { reps: [], followUps };
  const offPhone = repSource === 'followup_offphone';
  const reps = await tx.run(
    `MATCH (u:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
     MATCH (k:PracticeSkill)
     WHERE ($skillIds IS NOT NULL AND k.id IN $skillIds) OR ($skillIds IS NULL AND ts.toolId IN coalesce(k.defaultFor, []))
     MERGE (sp:SkillPractice {key: $uid + ':' + $id + ':' + k.id})
     ON CREATE SET sp:UserData:LogRecord, sp.id = $id + ':' + k.id, sp.ownerId = $uid, sp.createdAt = datetime(),
       sp.schemaVersion = 1, sp.at = datetime(), sp.skillIds = [k.id], sp.practiceId = ts.toolId, sp.module = ts.module,
       sp.source = $repSource, sp.hostTool = ts.toolId,
       sp.bandAtStart = ts.bandAtStart, sp.bandAtStartSource = ts.bandAtStartSource,
       sp.flagBlank = coalesce(ts.patternId IN $blankPatterns, false),
       sp.flagDissoc = coalesce(ts.patternId = 'dissociation_overmodulation', false),
       sp.durationSec = $durationSec, sp.exitedEarly = ts.status = 'exited_early',
       sp.thenVsNow = ts.thenVsNow, sp.thenVsNowDir = ts.thenVsNowDir, sp.actedOnUrge = ts.actedOnUrge,
       sp.offPhone = $offPhone, sp.logged = $logged, sp.fadeLevel = 0
     MERGE (u)-[:HAS_SKILL_PRACTICE]->(sp)
     MERGE (ts)-[:LOGGED_REP]->(sp)
     MERGE (sp)-[:PRACTICED]->(k)
     RETURN collect(sp.id) AS ids`,
    {
      uid, key, id: c.id, skillIds: c.skillIds, repSource, blankPatterns: BLANK_PATTERNS,
      durationSec: c.durationSec, offPhone, logged: offPhone ? 'self_report' : 'in_app',
    },
  );
  return { reps: (reps.records[0]?.get('ids') as string[] | undefined) ?? [], followUps };
}

export const startToolSession = callable<unknown, StartToolSessionResponse>(
  { auth: 'required', label: 'startToolSession', errorMessage: 'Could not start the session' },
  async ({ uid, data, request }) => {
    const s = parseOrInvalid(() => validateStart(data, new Date()), 'Invalid session');
    const toolUsageId = await writeTx((tx) => startTx(tx, uid as string, request.auth?.token?.email ?? null, s));
    return { id: s.id, toolUsageId };
  },
);

export const closeToolSession = callable<unknown, CloseToolSessionResponse>(
  { auth: 'required', label: 'closeToolSession', errorMessage: 'Could not save the session' },
  async ({ uid, data }) => {
    const c = parseOrInvalid(() => validateClose(data, new Date()), 'Invalid session');
    const out = await writeTx((tx) => closeTx(tx, uid as string, c));
    return { id: c.id, skillPracticeIds: out.reps, followUpIds: out.followUps };
  },
);

export const recordToolSession = callable<unknown, CloseToolSessionResponse & { toolUsageId: string }>(
  { auth: 'required', label: 'recordToolSession', errorMessage: 'Could not save the session' },
  async ({ uid, data, request }) => {
    const { start, close } = parseOrInvalid(() => validateRecord(data, new Date()), 'Invalid session');
    const out = await writeTx(async (tx) => {
      const toolUsageId = await startTx(tx, uid as string, request.auth?.token?.email ?? null, start);
      const closed = await closeTx(tx, uid as string, close);
      return { toolUsageId, skillPracticeIds: closed.reps, followUpIds: closed.followUps };
    });
    return { id: start.id, ...out };
  },
);

/**
 * "Did it help?" for a session closed without an answer (Today's tool_outcome card, the desktop
 * ContinuityCard). Resolved by tool session id, never "the latest" (F6). Once, within 12 h
 * (GUARDS.ToolSession.answer); a dismissal is remembered so Today stops asking.
 */
export const answerToolOutcome = callable<unknown, { ok: true; recorded: boolean }>(
  { auth: 'required', label: 'answerToolOutcome', errorMessage: 'Could not save that' },
  async ({ uid, data }) => {
    const a = parseOrInvalid(() => validateAnswer(data), 'Invalid answer');
    const res = await writeTx((tx) => tx.run(
      `MATCH (:User {id: $uid})-[:HAS_TOOL_SESSION]->(ts:ToolSession {key: $key})
       WHERE ${GUARDS.ToolSession.answer('ts')}
       WITH ts, CASE ts.closeKind WHEN 'regulation_down' THEN 'down' WHEN 'urge_change' THEN 'down'
                                  WHEN 'orienting' THEN 'orient' ELSE null END AS dir
       WITH ts, dir,
            CASE WHEN dir IS NULL THEN null ELSE $thenVsNow END AS tvn,
            CASE WHEN ts.closeKind IN ['urge', 'urge_change'] THEN $actedOnUrge ELSE null END AS acted
       SET ts.outcomeAskDismissed = CASE WHEN $dismissed AND tvn IS NULL AND acted IS NULL THEN true ELSE ts.outcomeAskDismissed END,
           ts.thenVsNow = coalesce(tvn, ts.thenVsNow),
           ts.thenVsNowDir = CASE WHEN tvn IS NULL THEN ts.thenVsNowDir ELSE dir END,
           ts.actedOnUrge = coalesce(acted, ts.actedOnUrge),
           ts.answeredAt = CASE WHEN tvn IS NULL AND acted IS NULL THEN ts.answeredAt ELSE datetime() END,
           ts.updatedAt = datetime()
       WITH ts, tvn
       OPTIONAL MATCH (ts)-[:COMPAT_USAGE]->(tu:ToolUsage) WHERE ${GUARDS.ToolUsage.outcome('tu')}
       WITH ts, tvn, tu, CASE tvn WHEN 'much_better' THEN 'helped' WHEN 'better' THEN 'somewhat'
                              WHEN 'same' THEN 'not_really' WHEN 'worse' THEN 'not_really' ELSE null END AS legacy
       FOREACH (x IN CASE WHEN tu IS NULL OR legacy IS NULL OR ts.toolId IN $notWhatHelps THEN [] ELSE [tu] END |
         SET x.outcome = legacy, x.outcomeTimestamp = datetime())
       RETURN ts.id AS id`,
      {
        uid, key: userKey(uid as string, a.toolSessionId), thenVsNow: a.thenVsNow, actedOnUrge: a.actedOnUrge, dismissed: a.dismissed,
        notWhatHelps: NOT_WHAT_HELPS,
      },
    ));
    return { ok: true, recorded: res.records.length > 0 };
  },
);
