import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SkillPlayer } from '../skillPlayer/SkillPlayer';
import { PersonPicker } from './PersonPicker';
import { PersonSafetyRoute } from './PersonSafetyRoute';
import { ToolLoading } from '../tools/ToolLoading';
import { ToolLoadError } from '../tools/ToolLoadError';
import { useProfileContext } from '../../hooks/useProfileContext';
import { getSkillRun, getSkillsContent } from '../../services/skills';
import { resumeRun, type RunContext } from '../../lib/skillRuntime/machine';
import { emotions } from '../../data/emotions';
import { presetPerson } from '../../lib/dearManDebrief';
import { personFirstPickerCopy, personFirstSafetyCopy, recordedPersonCtx, reopenGate, resumeAfterPicker, RUN_ID } from '../../lib/personFirst';
import { withAnswer, type KeptPerson, type PickedPerson } from '../../lib/people';

/**
 * A skill that asks who first (DEAR MAN's debrief and One message, Say no; people.md): the person picker, with the safety question
 * when the answer isn't fresh, then the skill on the player in this same visit (one ToolSession: a `followUp` link's
 * card resolves on it). Someone on the safety route gets the safety screen with the skill's heading and never the
 * skill (D4). A link naming a kept person whose answer is fresh skips the picker (`?person=`). A reopened run
 * (`?run=`, R9: a card asking how it went) skips it too, the person was asked on the first visit, but only once the
 * run has loaded (`reopenGate`): nothing to reopen (offline, a stale or edited link) is the picker, and a person now
 * on the safety route gets the safety screen. The player plays the record the gate checked (`resumeRecord`), never
 * a second read; after the picker it reopens only for the same person, else it starts fresh. Without the picker's copy the page shows the load error: the skill
 * never runs without the safety question.
 */
const GRID = new Set(emotions.map((e) => e.id));

export function PersonFirstSkill({ skillId, toolId, questionKey, headingKey, ctxFor }: {
  skillId: string;
  toolId: 'dear-man' | 'say-no' | 'give';
  /** The picker's question, as a `picker_<key>` of the skill's copy. */
  questionKey: string;
  /** The safety screen's heading, as a `picker_<key>` of the skill's copy. */
  headingKey: string;
  /** The skill's context for the person picked; the kept people list too, for what's counted on them (refusals). */
  ctxFor: (p: PickedPerson, people: readonly KeptPerson[] | null) => Record<string, string>;
}) {
  const { search } = useLocation();
  const [q] = useState(() => new URLSearchParams(search));
  const runId = q.get('run');
  const reopening = !!runId && RUN_ID.test(runId);
  const profile = useProfileContext(toolId);
  const [copy, setCopy] = useState<Record<string, string> | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  // The player's own context, only to ask whether a `?run=` will reopen (resumeRun), never to play.
  const [runCtx, setRunCtx] = useState<RunContext | null>(null);
  const [picked, setPicked] = useState<PickedPerson | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
  // The answers given this visit, folded into the kept list (withAnswer): the mounted slice doesn't reload after a keep
  // or edit, so without this *This is about someone else* would offer the old answer, a fresh *Yes, mostly* for
  // someone just named as dangerous (D4).
  const [answered, setAnswered] = useState<KeptPerson[] | null>(null);

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    getSkillsContent()
      .then((c) => {
        if (!live) return;
        const sk = c.skills.find((s) => s.id === skillId);
        setRunCtx(sk ? { skill: sk, shared: { parentOf: c.parentOf, fitsWhen: c.fitsWhen }, carried: [], gridIds: GRID, emotionLabel: (x) => x } : null);
        setCopy((sk?.copy as Record<string, string> | undefined) ?? {});
      })
      .catch(() => { if (live) setCopyFailed(true); });
    return () => { live = false; };
  }, [attempt, skillId]);

  const settled = profile.status !== 'loading';
  // A reopened run: read it once the profile has answered, to know whether it reopens and who it was with.
  const [reopen, setReopen] = useState<ReturnType<typeof reopenGate> | null>(reopening ? null : { kind: 'picker' });
  // The record the gate checked: the player plays exactly this one, never a second read.
  const [checked, setChecked] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!reopening || !settled || !runId || !copy) return;
    let live = true;
    getSkillRun(runId, toolId)
      .then((run) => {
        if (!live) return;
        const at = q.get('at');
        setChecked(run);
        setReopen(reopenGate(run, profile.slices?.people ?? null, (r) => !!runCtx && resumeRun(runCtx, r, at) !== null, Date.now()));
      })
      .catch(() => { if (live) setReopen({ kind: 'picker' }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reopening, settled, copy]);
  // A link's person: kept, answer fresh, not the safety route (else the picker asks). Dropped once the picker is used.
  const [openedAt] = useState(() => Date.now());
  const [usePreset, setUsePreset] = useState(true);
  const people = answered ?? profile.slices?.people ?? null;
  const preset = useMemo(() => (settled && usePreset ? presetPerson(people, q.get('person'), openedAt) : null),
    [settled, usePreset, people, q, openedAt]);

  // Fail closed (Gate 3): never the skill without who it's with and the safety question.
  if (copyFailed) return <ToolLoadError onRetry={() => { setCopyFailed(false); setCopy(null); setAttempt((n) => n + 1); }} />;
  if (!copy || !settled || !reopen) return <ToolLoading />;

  const pickerCopy = personFirstPickerCopy(copy, questionKey);
  const safetyCopy = personFirstSafetyCopy(copy, headingKey);
  if (!pickerCopy || !safetyCopy) return <ToolLoadError onRetry={() => { setCopy(null); setAttempt((n) => n + 1); }} />;
  if (reopen.kind === 'skill') return <SkillPlayer skillId={skillId} ctx={recordedPersonCtx(checked)} resumeRecord={checked} />;
  if (reopen.kind === 'safety') {
    return (
      <PersonSafetyRoute copy={safetyCopy} label={reopen.person.label}
        onBack={() => { setReopen({ kind: 'picker' }); setUsePreset(false); setPickerKey((k) => k + 1); }} />
    );
  }
  const who = picked ?? preset;

  if (!who) {
    return (
      <PersonPicker key={pickerKey} people={people} copy={pickerCopy}
        signedIn={profile.status !== 'signed-out' && profile.status !== 'error'}
        onDone={(p) => { setAnswered(withAnswer(people, p, new Date().toISOString())); setPicked(p); }} />
    );
  }
  if (who.route === 'safety') {
    return (
      <PersonSafetyRoute copy={safetyCopy} label={who.label}
        onBack={() => { setPicked(null); setUsePreset(false); setPickerKey((k) => k + 1); }} />
    );
  }
  return <SkillPlayer skillId={skillId} ctx={ctxFor(who, people)} {...(reopening ? { resumeRecord: resumeAfterPicker(checked, who) } : {})} />;
}
