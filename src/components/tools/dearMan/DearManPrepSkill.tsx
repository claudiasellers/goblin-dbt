import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PersonFirstSkill } from '../../people/PersonFirstSkill';
import { prepCtx, prepEntryCtx } from '../../../lib/dearManPrep';

/**
 * DEAR MAN's prep (the tool's default page, IE-01 Mode B, IE-B4; docs/design/dear-man-prep.md): who it's with first (the
 * person picker, with the safety question when the answer isn't fresh; people.md), then the `dear_man_prep` skill on
 * the skill player in this same visit, ending on the pocket card (Mode C) and *When is the conversation?*. Someone on
 * the safety route gets the safety screen and never the skill (D4). Recover's *Ask them* and the check-in carry what
 * they already know (the situation, a feeling, the band), read once.
 */
export function DearManPrepSkill() {
  const location = useLocation();
  const [entry] = useState(() => prepEntryCtx(location.state));
  return <PersonFirstSkill skillId="dear_man_prep" toolId="dear-man" questionKey="personWho" headingKey="safetyRouteHeading"
    ctxFor={(p, people) => prepCtx(p, people, entry)} />;
}
