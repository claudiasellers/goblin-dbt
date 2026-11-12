/**
 * Know this feeling (ER-10; docs/design/emotion-guide.md). No screen of its own: two skills under the one
 * `emotion-guide` tool id, played by the skill player. `emotionGuideSkillFor` picks: `?frame=myths` plays the myth
 * cards, anything else the feeling card.
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkillPlayer } from '../../components/skillPlayer/SkillPlayer';
import { emotionGuideSkillFor } from '../../lib/emotionGuide';

export function EmotionGuide() {
  const { search } = useLocation();
  const [skillId] = useState(() => emotionGuideSkillFor(new URLSearchParams(search).get('frame')));
  return <SkillPlayer skillId={skillId} />;
}
