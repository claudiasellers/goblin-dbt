/**
 * Keep it warm (GIVE, DBT IE Handouts 6 and 6a; PRD IE-06; docs/design/give.md). Who it's with first (the person
 * picker, with the safety question when the answer isn't fresh), then the `give` skill on the player in the same visit.
 * Someone on the safety route gets the safety screen and never the skill: keeping it warm isn't your job with someone
 * who isn't safe. The `break_return` and `repair_outcome` cards' `?run=` reopen the first visit's run.
 */
import { PersonFirstSkill } from '../../components/people/PersonFirstSkill';
import { giveCtx } from '../../lib/personFirst';

export function Give() {
  return <PersonFirstSkill skillId="give" toolId="give" questionKey="personWhoGive" headingKey="safetyRouteGiveHeading" ctxFor={giveCtx} />;
}
