/**
 * Which graph sources a tool visit recorded, as one Cypher predicate shared by every reader of "this
 * session's moves" (queuePartCandidate's toolSessionId, the trails records query). A visit's ids live on
 * the ToolSession itself or on the detail session it points at with DETAIL; the detail session is the
 * record (Find the feeling never writes `ToolSession.urgeIds`: its pull is `FindTheFeelingSession.pull`).
 *
 *   ToolSession.urgeIds              → ActionUrge / FeelingUrge (Do the Opposite, Urge Surfing)
 *   ToolSession.ext er.barrierSubId  → BarrierSubResponse (Problem Solve; exact match in the ids-only ext JSON)
 *   OppositeActionSession.urgeId     → ActionUrge
 *   FindTheFeelingSession.pull       → FeelingUrge
 *   InvalidationRecoverySession.pull → PullOption {flow: 'recover'}
 *   DearManSession momentResponseIds / turningPointIds / thoughtPatternIds / barriers
 *                                    → MomentResponse / TurningPoint / ThoughtPattern / DearManBarrier
 *
 * The caller binds the source, the ToolSession (or anything else: each line checks its label) and the
 * detail session (may be null), and puts its own EXPRESSES review-status condition beside this.
 */
export function sessionSourceMatch(src = 'src', ts = 'ts', d = 'd'): string {
  return `((${src}:ActionUrge OR ${src}:FeelingUrge) AND ${ts}:ToolSession AND ${src}.id IN coalesce(${ts}.urgeIds, []))
    OR (${src}:BarrierSubResponse AND ${ts}:ToolSession AND ${ts}.ext CONTAINS ('"barrierSubId":"' + ${src}.id + '"'))
    OR (${src}:ActionUrge AND ${d}:OppositeActionSession AND ${src}.id = ${d}.urgeId)
    OR (${src}:FeelingUrge AND ${d}:FindTheFeelingSession AND ${src}.id = ${d}.pull)
    OR (${src}:PullOption AND ${d}:InvalidationRecoverySession AND ${src}.flow = 'recover' AND ${src}.pullId = ${d}.pull)
    OR (${src}:MomentResponse AND ${d}:DearManSession AND ${src}.id IN coalesce(${d}.momentResponseIds, []))
    OR (${src}:TurningPoint AND ${d}:DearManSession AND ${src}.id IN coalesce(${d}.turningPointIds, []))
    OR (${src}:ThoughtPattern AND ${d}:DearManSession AND ${src}.id IN coalesce(${d}.thoughtPatternIds, []))
    OR (${src}:DearManBarrier AND ${d}:DearManSession AND ${src}.id IN coalesce(${d}.barriers, []))`;
}
