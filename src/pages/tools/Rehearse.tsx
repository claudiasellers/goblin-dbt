/**
 * Rehearse it (behavioural rehearsal, DBT IE Handouts 5, 6 and 8; PRD IE-02; docs/design/rehearse.md). Who the
 * conversation is with first (the person picker, with the safety question when the answer isn't fresh), then the
 * `rehearse` skill on the player in the same visit. Someone on the safety route gets the safety screen and never the
 * skill: no practice conversation with someone who might hurt you.
 */
import { PersonFirstSkill } from '../../components/people/PersonFirstSkill';
import { noticeCtx } from '../../lib/personFirst';

export function Rehearse() {
  // The same context as Notice them's: the person (or `none`) and *it tends to go badly* as the heads_up frame.
  return <PersonFirstSkill skillId="rehearse" toolId="rehearse" questionKey="personWhoRehearse" headingKey="safetyRouteRehearseHeading" ctxFor={noticeCtx} />;
}
