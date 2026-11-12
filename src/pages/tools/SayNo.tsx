/**
 * Say no (DBT IE Handouts 5 and 8; PRD IE-04; docs/design/say-no.md). Who's asking first (the person picker, with the
 * safety question when the answer isn't fresh), then the `say_no` skill on the player in the same visit. Someone on
 * the safety route gets the safety screen and never the skill. The `no_outcome` card's `?run=` reopens the first
 * visit's run at *Did you say no?*, without the picker.
 */
import { PersonFirstSkill } from '../../components/people/PersonFirstSkill';
import { sayNoCtx } from '../../lib/personFirst';

export function SayNo() {
  return <PersonFirstSkill skillId="say_no" toolId="say-no" questionKey="personWhoSayNo" headingKey="safetyRouteSayNoHeading" ctxFor={sayNoCtx} />;
}
