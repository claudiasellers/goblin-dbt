import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkillPlayer } from '../skillPlayer/SkillPlayer';
import { PersonPicker } from './PersonPicker';
import { PersonSafetyRoute } from './PersonSafetyRoute';
import { ToolLoading } from '../tools/ToolLoading';
import { ToolLoadError } from '../tools/ToolLoadError';
import { useProfileContext } from '../../hooks/useProfileContext';
import { getSkillsContent } from '../../services/skills';
import { presetPerson } from '../../lib/dearManDebrief';
import { personFirstPickerCopy, personFirstSafetyCopy } from '../../lib/personFirst';
import type { PickedPerson } from '../../lib/people';

/**
 * A skill that asks who first (DEAR MAN's debrief, Say no; people.md): the person picker, with the safety question
 * when the answer isn't fresh, then the skill on the player in this same visit (one ToolSession: a `followUp` link's
 * card resolves on it). Someone on the safety route gets the safety screen with the skill's heading and never the
 * skill (D4). A link naming a kept person whose answer is fresh skips the picker (`?person=`). A reopened run
 * (`?run=`, R9: a card asking how it went) skips it too: the person was asked on the first visit. Without the picker's
 * copy the page shows the load error: the skill never runs without the safety question.
 */
export function PersonFirstSkill({ skillId, toolId, questionKey, headingKey, ctxFor }: {
  skillId: string;
  toolId: 'dear-man' | 'say-no';
  /** The picker's question, as a `picker_<key>` of the skill's copy. */
  questionKey: string;
  /** The safety screen's heading, as a `picker_<key>` of the skill's copy. */
  headingKey: string;
  ctxFor: (p: PickedPerson) => Record<string, string>;
}) {
  const { search } = useLocation();
  const [q] = useState(() => new URLSearchParams(search));
  const reopening = !!q.get('run');
  const profile = useProfileContext(toolId);
  const [copy, setCopy] = useState<Record<string, string> | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const [picked, setPicked] = useState<PickedPerson | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (reopening) return;
    let live = true;
    getSkillsContent()
      .then((c) => { if (live) setCopy((c.skills.find((s) => s.id === skillId)?.copy as Record<string, string> | undefined) ?? {}); })
      .catch(() => { if (live) setCopyFailed(true); });
    return () => { live = false; };
  }, [attempt, skillId, reopening]);

  const settled = profile.status !== 'loading';
  // A link's person: kept, answer fresh, not the safety route (else the picker asks). Dropped once the picker is used.
  const [openedAt] = useState(() => Date.now());
  const [usePreset, setUsePreset] = useState(true);
  const preset = useMemo(() => (settled && usePreset ? presetPerson(profile.slices?.people ?? null, q.get('person'), openedAt) : null),
    [settled, usePreset, profile.slices, q, openedAt]);

  if (reopening) return <SkillPlayer skillId={skillId} />;
  // Fail closed (Gate 3): never the skill without who it's with and the safety question.
  if (copyFailed) return <ToolLoadError onRetry={() => { setCopyFailed(false); setCopy(null); setAttempt((n) => n + 1); }} />;
  if (!copy || !settled) return <ToolLoading />;

  const pickerCopy = personFirstPickerCopy(copy, questionKey);
  const safetyCopy = personFirstSafetyCopy(copy, headingKey);
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
  return <SkillPlayer skillId={skillId} ctx={ctxFor(who)} />;
}
