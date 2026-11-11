import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PersonFirstSkill } from '../../people/PersonFirstSkill';
import { debriefCtx } from '../../../lib/dearManDebrief';

const SKILL_ID = 'dear_man_debrief';

/**
 * DEAR MAN's debrief (`/tool/dear-man?mode=debrief`, IE-B2; docs/design/dear-man-debrief.md): who it was with first
 * (the person picker, with the safety question when their answer isn't fresh; people.md), then the debrief skill on
 * the skill player, in this same visit (src/components/people/PersonFirstSkill.tsx, shared with Say no). Someone on
 * the safety route gets the safety screen with the debrief's heading and never the skill (D4, Claudia 11 Nov: the
 * same screen as the prep). A link naming a kept person whose answer is fresh skips the picker.
 */
export function DearManDebrief() {
  const { search } = useLocation();
  const [partId] = useState(() => new URLSearchParams(search).get('partId'));
  return (
    <PersonFirstSkill skillId={SKILL_ID} toolId="dear-man" questionKey="personWhoDebrief" headingKey="safetyRouteDebriefHeading"
      ctxFor={(who) => debriefCtx(who, partId)} />
  );
}
