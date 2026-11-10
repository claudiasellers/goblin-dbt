/**
 * Check the Facts (DBT ER Handout 8; docs/design/check-the-facts.md). No screen of its own: the skill's
 * steps, options, transitions and hand-offs are graph content (`schema/skills.cypher`), played by the one
 * skill player (docs/design/skill-runtime.md).
 */
import { SkillPlayer } from '../../components/skillPlayer/SkillPlayer';

export function CheckTheFacts() {
  return <SkillPlayer skillId="check_the_facts" />;
}
