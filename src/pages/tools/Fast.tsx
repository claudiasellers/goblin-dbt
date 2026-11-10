/**
 * Keep your self-respect (FAST, DBT IE Handout 7; docs/design/fast.md). No screen of its own: two skills under the
 * one `fast` tool id, played by the skill player (docs/design/skill-runtime.md). `fastSkillFor` picks which.
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkillPlayer } from '../../components/skillPlayer/SkillPlayer';
import { useBand } from '../../hooks/useBand';
import { fastSkillFor } from '../../lib/fastSkill';

export function Fast() {
  const { search } = useLocation();
  const band = useBand();
  const [skillId] = useState(() => fastSkillFor(new URLSearchParams(search).get('frame'), band.current()?.value));
  return <SkillPlayer skillId={skillId} />;
}
