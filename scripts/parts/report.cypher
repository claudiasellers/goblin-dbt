// Parts review report (docs/design/parts.md, "Measuring it" and "Build order": each phase is gated on
// the previous phase's harm signals). Read-only; run it by hand, in Aura Workspace or with
//   node scripts/load-graph.mjs --file scripts/parts/report.cypher --no-content-refresh
// Two statements. #1 Harm signals: one row per person with any signal, keyed by an opaque hash prefix
// of the account id (never the id, a name, an email or anything the person wrote). #2 Integration
// signals: aggregates across everyone, one row per metric, no per-person rows.
// The harm definitions are functions/src/parts/harm.ts's (tests/parts-harm-report.test.mjs pins the
// two together); the numbers come from PartsPolicy, with harm.ts's defaults when it has none.
// A signal pauses offers for that person (Phase 4), never their parts, and goes to review.
// Not recorded anywhere, so not here: parts deleted (deleteMyParts removes the records) and parts
// turned off (the setting keeps only its current value; #2 counts people with parts and the setting
// off now). The "Not me" rate needs offers (Phase 4).

// #1 Harm signals, over the last harmWindowDays (28), both ends inclusive.
OPTIONAL MATCH (pol:PartsPolicy {id: 'parts'})
WITH coalesce(pol.harmWindowDays, 28) AS windowDays, coalesce(pol.crisisPauseHours, 48) AS crisisHours,
     coalesce(pol.tenderRepeatCount, 2) AS repeatCount, datetime() AS now
WITH crisisHours, repeatCount, now, now - duration({days: windowDays}) AS since
MATCH (u:User)
WHERE EXISTS { MATCH (u)-[:HAS_PART_SESSION]->(:PartSession) }
   OR EXISTS { MATCH (u)-[:HAS_FOLLOW_UP]->(:FollowUp {type: 'part_checkback'}) }
CALL {
  WITH u, since, now
  OPTIONAL MATCH (u)-[:HAS_FOLLOW_UP]->(f:FollowUp {type: 'part_checkback'})
  WHERE f.harmSignal = true AND f.resolvedAt >= since AND f.resolvedAt <= now
  RETURN count(f) AS louder, max(f.resolvedAt) AS louderAt
}
CALL {
  WITH u, since, now, crisisHours
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession)
  WHERE ps.createdAt >= since AND ps.createdAt <= now
  OPTIONAL MATCH (c:CheckIn {ownerId: u.id})
  WHERE ps IS NOT NULL AND c.safetyFlagId IS NOT NULL AND c.timestamp > ps.createdAt
    AND c.timestamp <= ps.createdAt + duration({hours: crisisHours}) AND c.timestamp <= now
  RETURN count(DISTINCT CASE WHEN c IS NOT NULL THEN ps END) AS crisisAfterMeet, max(c.timestamp) AS crisisAt
}
CALL {
  WITH u, since, now
  OPTIONAL MATCH (u)-[:HAS_PART_SESSION]->(ps:PartSession)
  WHERE ps.createdAt >= since AND ps.createdAt <= now AND ps.stopReason IN ['tender', 'own_words', 'not_self']
  RETURN count(CASE WHEN ps.stopReason IN ['tender', 'own_words'] THEN 1 END) AS tenderStops,
         max(CASE WHEN ps.stopReason IN ['tender', 'own_words'] THEN ps.createdAt END) AS tenderAt,
         count(CASE WHEN ps.stopReason = 'not_self' THEN 1 END) AS notSelfStops,
         max(CASE WHEN ps.stopReason = 'not_self' THEN ps.createdAt END) AS notSelfAt
}
WITH u, louder, louderAt, crisisAfterMeet, crisisAt, tenderStops, tenderAt, notSelfStops, notSelfAt,
     tenderStops >= repeatCount AS tenderRepeat, notSelfStops >= repeatCount AS notSelfRepeat
WHERE louder > 0 OR crisisAfterMeet > 0 OR tenderRepeat OR notSelfRepeat
WITH u, louder, crisisAfterMeet, tenderStops, tenderRepeat, notSelfStops, notSelfRepeat,
     reduce(m = null, x IN [louderAt, crisisAt, CASE WHEN tenderRepeat THEN tenderAt END, CASE WHEN notSelfRepeat THEN notSelfAt END] |
       CASE WHEN x IS NOT NULL AND (m IS NULL OR x > m) THEN x ELSE m END) AS lastAt
RETURN 'harm' AS section, left(apoc.util.sha256([u.id]), 12) AS person,
       louder, crisisAfterMeet, tenderStops, tenderRepeat, notSelfStops, notSelfRepeat,
       toString(date(lastAt)) AS lastDate
ORDER BY lastDate DESC, person;

// #2 Integration signals (all time, everyone): counts only.
OPTIONAL MATCH (pol:PartsPolicy {id: 'parts'})
WITH coalesce(pol.tooManyPartsCount, 3) AS manyCount, coalesce(pol.tooManyPartsDays, 7) AS manyDays
CALL {
  OPTIONAL MATCH (p:Part)
  RETURN count(CASE WHEN p.status IN ['active', 'resting'] THEN 1 END) AS partsKept,
         count(CASE WHEN p.status = 'resting' THEN 1 END) AS partsResting,
         count(CASE WHEN p.status = 'set_aside' THEN 1 END) AS partsSetAside,
         count(CASE WHEN p.tender = true THEN 1 END) AS partsTender,
         count(DISTINCT p.ownerId) AS peopleWithParts
}
CALL {
  OPTIONAL MATCH (ps:PartSession)
  RETURN count(ps) AS visits, count(CASE WHEN ps.status = 'saved' THEN 1 END) AS visitsSaved,
         count(CASE WHEN ps.handoffsJson IS NOT NULL THEN 1 END) AS p2Opened,
         count(CASE WHEN ps.blendCheck = 'running' THEN 1 END) AS blendRunning
}
// The feel-toward shift: a part whose feel-toward answers (its visits in order, each in the order asked)
// hold a non-Self-like answer before a later Self-like one (the feel options' selfLike flag).
CALL {
  OPTIONAL MATCH (o:PartOption {flow: 'meet', step: 'feel'}) WHERE o.selfLike IS NOT NULL
  WITH collect(CASE WHEN o.selfLike = true THEN o.id END) AS selfIds, collect(CASE WHEN o.selfLike = false THEN o.id END) AS nonSelfIds
  OPTIONAL MATCH (ps:PartSession)-[:OF_PART]->(p:Part)
  WITH selfIds, nonSelfIds, p, ps ORDER BY ps.createdAt
  WITH selfIds, nonSelfIds, p, reduce(acc = [], s IN collect(coalesce(ps.feelTowardIds, [])) | acc + s) AS feels
  WITH p, [i IN range(0, size(feels) - 1) WHERE feels[i] IN nonSelfIds] AS nonSelfAt,
       [i IN range(0, size(feels) - 1) WHERE feels[i] IN selfIds] AS selfAt
  RETURN count(CASE WHEN size(nonSelfAt) > 0 AND size(selfAt) > 0 AND nonSelfAt[0] < selfAt[-1] THEN p END) AS feelShiftParts,
         count(CASE WHEN size(nonSelfAt) > 0 THEN p END) AS partsWithNonSelfFeel
}
CALL {
  OPTIONAL MATCH (ts:ToolSession) WHERE ts.ext CONTAINS '"unblendShown":true'
  RETURN count(ts) AS unblendLinesShown
}
CALL {
  OPTIONAL MATCH (t:PartTag)
  WITH coalesce(t.source, 'unknown') AS source, count(t) AS n
  RETURN apoc.map.fromPairs(collect(CASE WHEN n > 0 THEN [source, n] END)) AS tagsBySource
}
CALL {
  OPTIONAL MATCH (f:FollowUp {type: 'part_checkback'}) WHERE f.resolvedAt IS NOT NULL
  WITH f, CASE WHEN f.outcome CONTAINS '"choiceId":"' THEN split(split(f.outcome, '"choiceId":"')[1], '"')[0] ELSE 'none' END AS choice
  WITH choice, count(f) AS n, count(CASE WHEN f.harmSignal = true THEN 1 END) AS loud
  RETURN apoc.map.fromPairs(collect(CASE WHEN n > 0 THEN [choice, n] END)) AS checkbackAnswers,
         sum(n) AS checkbacksAnswered, sum(loud) AS checkbacksLouder
}
CALL {
  OPTIONAL MATCH (r:PartRevisit)
  WITH coalesce(r.answer, 'none') AS answer, count(r) AS n
  RETURN apoc.map.fromPairs(collect(CASE WHEN n > 0 THEN [answer, n] END)) AS stillTrueAnswers
}
CALL {
  OPTIONAL MATCH (c:PartCandidate)
  RETURN count(c) AS candidatesQueued, count(CASE WHEN c.status = 'accepted' THEN 1 END) AS candidatesAccepted,
         count(CASE WHEN c.status = 'dismissed' THEN 1 END) AS candidatesDismissed,
         count(CASE WHEN c.status = 'open' THEN 1 END) AS candidatesOpen
}
CALL {
  WITH manyCount, manyDays
  OPTIONAL MATCH (u:User)-[:HAS_PART]->(p:Part)
  WITH u, manyCount, manyDays, collect(p.createdAt) AS made
  WITH u, manyCount, reduce(m = 0, t IN made | CASE WHEN size([x IN made WHERE x >= t AND x < t + duration({days: manyDays})]) > m
       THEN size([x IN made WHERE x >= t AND x < t + duration({days: manyDays})]) ELSE m END) AS most
  RETURN count(CASE WHEN most >= manyCount THEN u END) AS peopleManyPartsInSpan
}
CALL {
  OPTIONAL MATCH (u:User) WHERE NOT coalesce(u.partsEnabled, false) AND EXISTS { MATCH (u)-[:HAS_PART]->(:Part) }
  RETURN count(u) AS peoplePartsOffWithParts
}
UNWIND [
  ['parts_kept', partsKept], ['parts_resting', partsResting], ['parts_set_aside', partsSetAside],
  ['parts_tender', partsTender], ['people_with_parts', peopleWithParts],
  ['visits', visits], ['visits_saved', visitsSaved],
  ['feel_shift_parts', feelShiftParts], ['parts_with_non_self_feel', partsWithNonSelfFeel],
  ['unblend_lines_shown', unblendLinesShown], ['tags_by_source', tagsBySource],
  ['checkback_answers', checkbackAnswers], ['checkbacks_answered', checkbacksAnswered],
  ['louder_share', CASE WHEN checkbacksAnswered = 0 THEN null ELSE round(1.0 * checkbacksLouder / checkbacksAnswered, 2) END],
  ['still_true_answers', stillTrueAnswers],
  ['candidates_queued', candidatesQueued], ['candidates_accepted', candidatesAccepted],
  ['candidates_dismissed', candidatesDismissed], ['candidates_open', candidatesOpen],
  ['watched_p2_opened', p2Opened], ['watched_blend_running', blendRunning],
  ['watched_people_many_parts_in_span', peopleManyPartsInSpan],
  ['watched_people_parts_off_with_parts', peoplePartsOffWithParts],
  ['watched_parts_deleted', null], ['watched_parts_turned_off', null], ['not_me_rate', null]
] AS row
RETURN 'integration' AS section, row[0] AS metric, row[1] AS value;
