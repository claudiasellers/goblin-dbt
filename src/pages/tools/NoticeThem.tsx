/**
 * Notice them (mindfulness of others, DBT IE Handout 12; PRD IE-10; docs/design/notice-them.md). Who it's about first
 * (the person picker, with the safety question when the answer isn't fresh), then the `notice_them` skill on the player
 * in the same visit. Someone on the safety route gets the safety screen and never the skill: noticing danger signs is
 * the right kind of attention with someone who isn't safe. The `notice_back` card's `?run=` reopens the first visit's
 * run at *Did you get to notice them?*.
 */
import { PersonFirstSkill } from '../../components/people/PersonFirstSkill';
import { noticeCtx } from '../../lib/personFirst';

export function NoticeThem() {
  return <PersonFirstSkill skillId="notice_them" toolId="mindfulness-of-others" questionKey="personWhoNotice" headingKey="safetyRouteNoticeHeading" ctxFor={noticeCtx} />;
}
