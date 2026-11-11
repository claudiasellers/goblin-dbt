import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkillPlayer } from '../../skillPlayer/SkillPlayer';
import { PersonPicker } from '../../people/PersonPicker';
import { PersonSafetyRoute } from '../../people/PersonSafetyRoute';
import { ToolLoading } from '../ToolLoading';
import { ToolLoadError } from '../ToolLoadError';
import { useProfileContext } from '../../../hooks/useProfileContext';
import { getSkillsContent } from '../../../services/skills';
import { debriefCtx, debriefPickerCopy, debriefSafetyCopy, presetPerson } from '../../../lib/dearManDebrief';
import type { PickedPerson } from '../../../lib/people';

const SKILL_ID = 'dear_man_debrief';

/**
 * DEAR MAN's debrief (`/tool/dear-man?mode=debrief`, IE-B2; docs/design/dear-man-debrief.md): who it was with first
 * (the person picker, with the safety question when their answer isn't fresh; people.md), then the debrief skill on
 * the skill player, in this same visit (one ToolSession: a `followUp` link's card resolves on it). Someone on the
 * safety route gets the safety screen with the debrief's heading and never the skill (D4, Claudia 11 Nov: the same
 * screen as the prep). A link naming a kept person whose answer is fresh skips the picker (src/lib/dearManDebrief.ts).
 * Without the picker's copy the page shows the load error: the debrief never runs without the safety question.
 */
export function DearManDebrief() {
  const { search } = useLocation();
  const [q] = useState(() => new URLSearchParams(search));
  const partId = q.get('partId');
  const profile = useProfileContext('dear-man');
  const [copy, setCopy] = useState<Record<string, string> | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const [picked, setPicked] = useState<PickedPerson | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getSkillsContent()
      .then((c) => { if (live) setCopy((c.skills.find((s) => s.id === SKILL_ID)?.copy as Record<string, string> | undefined) ?? {}); })
      .catch(() => { if (live) setCopyFailed(true); });
    return () => { live = false; };
  }, [attempt]);

  const settled = profile.status !== 'loading';
  // A link's person: kept, answer fresh, not the safety route (else the picker asks). Dropped once the picker is used.
  const [openedAt] = useState(() => Date.now());
  const [usePreset, setUsePreset] = useState(true);
  const preset = useMemo(() => (settled && usePreset ? presetPerson(profile.slices?.people ?? null, q.get('person'), openedAt) : null),
    [settled, usePreset, profile.slices, q, openedAt]);

  // Fail closed (Gate 3): never the debrief without who it was with and the safety question.
  if (copyFailed) return <ToolLoadError onRetry={() => { setCopyFailed(false); setCopy(null); setAttempt((n) => n + 1); }} />;
  if (!copy || !settled) return <ToolLoading />;

  const pickerCopy = debriefPickerCopy(copy);
  const safetyCopy = debriefSafetyCopy(copy);
  const who = picked ?? preset;
  if (!pickerCopy || !safetyCopy) return <ToolLoadError onRetry={() => { setCopy(null); setAttempt((n) => n + 1); }} />;

  if (!who) {
    return (
      <PersonPicker key={pickerKey} people={profile.slices?.people ?? null} copy={pickerCopy}
        signedIn={profile.status !== 'signed-out' && profile.status !== 'error'}
        onDone={setPicked} />
    );
  }
  if (who.route === 'safety') {
    return (
      <PersonSafetyRoute copy={safetyCopy} label={who.label}
        onBack={() => { setPicked(null); setUsePreset(false); setPickerKey((k) => k + 1); }} />
    );
  }
  return <SkillPlayer skillId={SKILL_ID} ctx={debriefCtx(who, partId)} />;
}
