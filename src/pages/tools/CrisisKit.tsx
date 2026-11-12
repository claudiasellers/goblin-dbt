/**
 * My crisis kit (DT-03; docs/design/crisis-kit.md). No screen of its own: two skills under the one `crisis-kit` tool
 * id, played by the skill player. `crisisKitSkillFor` picks: `?frame=build` makes it, anything else opens it.
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkillPlayer } from '../../components/skillPlayer/SkillPlayer';
import { crisisKitSkillFor } from '../../lib/crisisKit';

export function CrisisKit() {
  const { search } = useLocation();
  const [skillId] = useState(() => crisisKitSkillFor(new URLSearchParams(search).get('frame')));
  return <SkillPlayer skillId={skillId} />;
}
