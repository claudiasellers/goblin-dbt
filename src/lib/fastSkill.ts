/**
 * Which of FAST's two skills opens (docs/design/fast.md), decided once when the page opens: the Let go route for
 * `?frame=let_go` (a host that heard a no) or a carried flooded reading (the line now, the review another day;
 * plan D1: never asked or inferred here); the standalone review otherwise.
 */
export function fastSkillFor(frame: string | null, carriedBand: string | null | undefined): 'fast_let_go' | 'fast_review' {
  return frame === 'let_go' || carriedBand === 'flooded' ? 'fast_let_go' : 'fast_review';
}
