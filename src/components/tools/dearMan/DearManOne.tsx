import { PersonFirstSkill } from '../../people/PersonFirstSkill';
import { oneMessageCtx } from '../../../lib/dearManOne';

/**
 * One message (`/tool/dear-man?mode=one`, IE-01 Mode A, IE-B3; docs/design/one-message.md): who it's for first (the
 * person picker, with the safety question when the answer isn't fresh; people.md), then the `dear_man_one` skill on
 * the skill player in this same visit. Someone on the safety route gets the safety screen with One message's heading
 * and never the skill (D4). The `ask_delayed` card's `?run=` reopens the saved message at *Still want to send it?*.
 */
export function DearManOne() {
  return <PersonFirstSkill skillId="dear_man_one" toolId="dear-man" questionKey="personWhoOne" headingKey="safetyRouteOneHeading" ctxFor={oneMessageCtx} />;
}
