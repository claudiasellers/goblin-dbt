import { useEffect, useRef, useState } from 'react';
import { PERSON_ROLES, roleLabel } from '../../data/people';
import {
  afterPick, afterSafe, fillWho, pickedKept, picked, personWrite, pickerStart,
  type KeptPerson, type PickedPerson, type PickerDraft, type PickerStage, type PersonPickerCopy,
} from '../../lib/people';
import type { PersonRisk, PersonSafe } from '../../lib/personSafety';
import { editProfileItem, keepProfileItem } from '../../services/profile';
import { profileCache } from '../../lib/profileCache';
import { newId } from '../../lib/spine/ids';
import { focusLine, focusStepStart } from '../../lib/focusStart';
import { choiceButton, choiceSelected, inputField, linkButton, primaryButton, secondaryText } from '../tools/oppositeAction/styles';

/**
 * "Who's this with?" and "Is it safe to bring hard things up with them?" (IE-03 minimal + D4,
 * docs/design/people.md): the people the person kept first, *Someone new* (a nickname, optional, and a role chip),
 * then the safety question whenever there's no fresh answer. Steps in src/lib/people.ts.
 *
 * A new person is kept only when they're named and the person is signed in, and the screen says so before the tap
 * (the tap is the yes, plan C2). A kept person asked again is updated with the new answer. A failed write never
 * blocks the flow: the pick goes on without an id (someone new) or with the old one.
 *
 * The host decides what the answer means (src/lib/personSafety.ts `personRoute`): DEAR MAN's prep goes to its
 * safety route screen on `safety`, and shows a heads-up on `heads_up`.
 */
export function PersonPicker({ people, signedIn, copy, onDone, onBack }: {
  /** The `people` slice (null while signed out or before it loads: the picker opens on Someone new). */
  people: readonly KeptPerson[] | null;
  signedIn: boolean;
  copy: PersonPickerCopy;
  onDone: (p: PickedPerson) => void;
  /** Shown on the first stage when the host has somewhere to go back to. */
  onBack?: () => void;
}) {
  const [stage, setStage] = useState<PickerStage>(() => pickerStart(people));
  const [draft, setDraft] = useState<PickerDraft>({ personId: null, label: '', role: null });
  const [safe, setSafe] = useState<PersonSafe | null>(null);
  const [reask, setReask] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // A step change moves focus to the new step's heading (only when the tapped control went away).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    focusStepStart(root.current);
  }, [stage]);
  // *Things changed with someone?* goes away when tapped, on the same stage: focus its hint.
  const hint = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (reask) focusLine(hint.current); }, [reask]);

  const finish = async (s: PersonSafe, risk: PersonRisk) => {
    const d = { ...draft, role: draft.role ?? 'other' };
    const write = personWrite(d, s, risk, { signedIn, nowIso: new Date().toISOString() });
    let personId = d.personId;
    if (write) {
      setBusy(true);
      try {
        if (write.op === 'keep') {
          const id = newId();
          const r = await keepProfileItem({ kind: 'person', id, value: write.value });
          profileCache.bump(r.version);
          personId = r.id;
        } else if (d.personId) {
          profileCache.bump(await editProfileItem({ kind: 'person', id: d.personId, value: write.value }));
        }
      } catch {
        // Not kept this time: the flow goes on with who they are on this screen.
      } finally {
        setBusy(false);
      }
    }
    onDone(picked(d, s, risk, personId));
  };

  const pickKept = (p: KeptPerson) => {
    if (afterPick(p, { reask, now: Date.now() }) === 'done') { onDone(pickedKept(p)); return; }
    setDraft({ personId: p.id, label: p.label, role: p.role });
    setStage('safe');
  };

  const back = (to: PickerStage | null) => (to
    ? <button type="button" onClick={() => setStage(to)} className={linkButton}>Back</button>
    : onBack ? <button type="button" onClick={onBack} className={linkButton}>Back</button> : null);
  const listBack: PickerStage | null = people && people.length > 0 ? 'list' : null;
  const who = draft.label.trim() || null;

  if (stage === 'list' && people && people.length > 0) {
    return (
      <div ref={root} className="space-y-4" data-testid="person-picker" data-stage="list">
        {back(null)}
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{copy.personWho}</h3>
        {reask && <p ref={hint} className={secondaryText}>{copy.personChangedHint}</p>}
        <div className="flex flex-wrap gap-2">
          {people.map((p) => (
            <button key={p.id} type="button" onClick={() => pickKept(p)}
              className="min-h-11 px-4 py-2 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] lift-secondary text-left">
              {p.label}
              {roleLabel(p.role) && <span className="ml-1 text-sm text-[var(--color-text-tertiary)]">· {roleLabel(p.role)}</span>}
            </button>
          ))}
          <button type="button" onClick={() => { setDraft({ personId: null, label: '', role: null }); setStage('new'); }}
            className="min-h-11 px-4 py-2 rounded-full border border-dashed border-[var(--color-border)] text-[var(--color-text-secondary)] lift-secondary">
            + {copy.personNew}
          </button>
        </div>
        {!reask && <button type="button" onClick={() => setReask(true)} className={linkButton}>{copy.personChanged}</button>}
      </div>
    );
  }

  if (stage === 'new' || stage === 'list') {
    const named = draft.label.trim().length > 0;
    const note = !signedIn ? copy.personSignedOutLine : named ? fillWho(copy.personKeepLine, draft.label) : copy.personNoNameLine;
    return (
      <div ref={root} className="space-y-4" data-testid="person-picker" data-stage="new">
        {back(listBack)}
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{copy.personWho}</h3>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{copy.personNameLabel}</span>
          <input type="text" value={draft.label} maxLength={40} autoComplete="off" spellCheck={false}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            aria-describedby="person-name-hint" className={inputField} />
          <span id="person-name-hint" className="block text-xs text-[var(--color-text-tertiary)]">{copy.personNameHint}</span>
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--color-text-primary)] mb-2">{copy.personRoleLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {PERSON_ROLES.map((r) => (
              <button key={r.id} type="button" aria-pressed={draft.role === r.id} onClick={() => setDraft({ ...draft, role: r.id })}
                className={`min-h-11 px-4 py-2 rounded-full border motion-safe:transition-colors ${draft.role === r.id
                  ? 'bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] border-transparent'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className={secondaryText}>{note}</p>
        <button type="button" disabled={!draft.role} onClick={() => { setSafe(null); setStage('safe'); }} className={primaryButton}>
          {copy.personGoOn}
        </button>
      </div>
    );
  }

  if (stage === 'safe') {
    const opts: Array<[PersonSafe, string]> = [['yes', copy.safeYes], ['no', copy.safeNo], ['unsure', copy.safeUnsure]];
    return (
      <div ref={root} className="space-y-4" data-testid="person-picker" data-stage="safe">
        {back(draft.personId ? listBack : 'new')}
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{fillWho(copy.safeQuestion, who)}</h3>
        <div className="space-y-2">
          {opts.map(([id, label]) => (
            <button key={id} type="button" disabled={busy} aria-pressed={safe === id}
              onClick={() => { setSafe(id); if (afterSafe(id) === 'done') void finish(id, 'none'); else setStage('risk'); }}
              className={`${choiceButton} ${safe === id ? choiceSelected : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // risk: after *No* / *Not sure*.
  const risks: Array<[PersonRisk, string]> = [['harm', copy.riskHarm], ['invalidating', copy.riskBadly], ['unstated', copy.riskUnsaid]];
  return (
    <div ref={root} className="space-y-4" data-testid="person-picker" data-stage="risk">
      {back('safe')}
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{copy.riskQuestion}</h3>
      <div className="space-y-2">
        {risks.map(([id, label]) => (
          <button key={id} type="button" disabled={busy} onClick={() => { void finish(safe ?? 'unsure', id); }} className={choiceButton}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
