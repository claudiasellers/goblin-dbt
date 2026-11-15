/**
 * Wise mind's two forms (MF-04; docs/design/wise-mind-check.md): the hand-built practice (docs/design/wise-mind.md)
 * and the check on the skill player (`wise_mind_check`). The check is `?frame=check` (*Check a decision before I act*, the Tools
 * card) or a run being reopened (`?run=`: the look-back card, or an unfinished check picked up again); everything else
 * is the practice. Read once per visit: a link to the other form is a new visit.
 */
export function isWiseMindCheck(search: string): boolean {
  const q = new URLSearchParams(search);
  return q.get('frame') === 'check' || !!q.get('run');
}
