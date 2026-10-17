/**
 * Every parts surface the review harness shows (dev/parts-review.html), each the app's real component on
 * the fixture's copy (every row treated as signed off), in the order of the review pack: in the moment,
 * Meet a part, over weeks. The `who` line above each is harness chrome, not app copy. A branch either
 * sets what the stubbed server answers (Meet a part's entry gate, a failing delete) or is reached by
 * tapping through the real component (./driver.ts).
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import '../../src/components/tools/findTheFeeling/shape/shape.css';
import '../../src/components/tools/findTheFeeling/tune/tune.css';
import type { PartsContent } from '../../src/data/partsContentTypes';
import type { PartsEntry } from '../../src/data/partsTypes';
import type { FeelingUrge } from '../../src/data/findTheFeelingTypes';
import { getPartsContent } from '../../src/services/partsContent';
import { getFindTheFeelingContent } from '../../src/services/neo4j';
import { getSpineContent } from '../../src/services/spine';
import { answerPartCandidate, queuePartCandidate } from '../../src/services/parts';
import { ToolSessionProvider } from '../../src/contexts/ToolSessionContext';
import { useUnblendLine } from '../../src/hooks/useUnblendLine';
import { recoverPullOption, type UnblendSource } from '../../src/lib/unblendLine';
import { angryCopyFrom, angryLaterCopy, angryNotNowId, orderHurts } from '../../src/lib/angryPart';
import { dismissCandidateRequest, partsOfMeCopy } from '../../src/lib/partsOfMe';
import { copeParts, keptLines } from '../../src/lib/copeAhead';
import { MeetAPart } from '../../src/pages/tools/MeetAPart';
import { TwoPulls } from '../../src/pages/tools/TwoPulls';
import { AngryPartCard } from '../../src/components/parts/AngryPartCard';
import { PartCheckbackCard } from '../../src/components/parts/PartCheckbackCard';
import { PartsSettings } from '../../src/components/parts/PartsSettings';
import { CopeAheadStep } from '../../src/components/parts/CopeAheadStep';
import { PartsOfMe } from '../../src/components/me/PartsOfMe';
import { PartsReflect } from '../../src/components/insights/PartsReflect';
import { TrailsReflect } from '../../src/components/insights/TrailsReflect';
import { PartTagRow } from '../../src/components/spine/PartTagRow';
import { TooMuchLink } from '../../src/components/capacity/TooMuchLink';
import { DARK } from '../../src/components/tools/findTheFeeling/shape/palette';
import { linkButton, secondaryText } from '../../src/components/tools/oppositeAction/styles';
import { answer, logEvent } from './backend';
import { CANDIDATES, checkbackItem, checkbackItemTwo, ME_ITEMS, ME_LONG, PART_IDS, REFLECT, reflectTrails, slices, trailEvidence, trailItem, type TrailKind } from './data';
import { TrailOfferCard } from '../../src/components/parts/TrailOfferCard';
import type { DriveStep } from './driver';
import { ME_OFF_SURFACE } from './meOff';
import { WISE_MIND_PARTS_SURFACE } from './wiseMindParts'; // lane 4: Wise mind's step back
import { COPE_AHEAD_AFTER_SURFACE } from './copeAheadAfter'; // lane 4: Cope Ahead's after card (not parts)
import { PARTS } from '../parts-example';
import hostCopy from 'virtual:review-host-copy';
import { DebriefWho } from '../../src/components/parts/DebriefWho';
import { PartLaterLine } from '../../src/components/parts/PartLaterLine';
import { TapCard } from '../../src/components/tools/oppositeAction/TapCardLoop';
import { GoalLine as OaGoalLine } from '../../src/components/tools/oppositeAction/GoalLine';
import { useOaGoalLine } from '../../src/hooks/useOaGoalLine';
import { PS_AMBIVALENCE_BARRIER, psLaterCandidate, psLaterCopy } from '../../src/lib/psAmbivalence';
// ---- The den (lane 2) ----
import { Den } from '../../src/components/parts/den/Den';
import { denCopy } from '../../src/lib/den';
import type { GetDenResponse } from '../../src/data/partsTypes';
import { vecToSig } from '../../src/lib/partFigure';
// ---- end the den ----
// ---- A part's story (lane 2) ----
import { PartStory } from '../../src/components/parts/story/PartStory';
import { partStoryCopy } from '../../src/lib/partStory';
import type { GetPartStoryResponse } from '../../src/data/partsTypes';
// ---- end a part's story ----
import { WISE_MIND_SURFACE } from './wiseMind'; // lane 1: Wise mind
import { SAY_SURFACE } from './sayToPart'; // lane 1: say something to it
import { COPE_CLOSING_SURFACE } from './copeAheadClosing'; // lane 3: Cope Ahead's screens 5–7
import { COPE_AHEAD_SURFACE } from './copeAhead'; // lane 1: Cope Ahead

export interface Branch { id: string; label: string; steps?: DriveStep[] }
export interface Surface {
  id: string;
  /** The sign-off pack surface it shows (scripts/parts/review.mjs `surfaces`, its `id`). */
  pack: string;
  title: string;
  /** Who sees it and when: one muted sentence (harness chrome). */
  who: string;
  branches?: Branch[];
  /** Router state for the page (Meet a part's entry). */
  routeState?: (branch: string) => unknown;
  /** The address's query for the page (Two pulls' entry: `?a=&b=` or `?pair=`). */
  routeSearch?: (branch: string) => string;
  /** What the stubbed server answers for this surface, set before anything mounts. */
  setup?: (branch: string) => void;
  render: (o: { branch: string; plain: boolean }) => ReactNode;
}

/** The parts content as the app reads it (the virtual parts.json: fixture, all signed off, ids under ?ids=1). */
function useParts(): PartsContent | null {
  const [c, setC] = useState<PartsContent | null>(null);
  useEffect(() => { getPartsContent().then(setC).catch(() => { /* stays empty */ }); }, []);
  return c;
}

const mockNote = 'text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]';

/**
 * What the host shows once a card or step hands back (Today drops the card, DEAR MAN goes on): the host's
 * next thing takes focus, as TodayStack and DearMan.tsx move it, so focus never falls to the page.
 */
function HostNext({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <p ref={ref} tabIndex={-1} className={`${mockNote} focus:outline-none`}>{children}</p>;
}
const chipBase = 'min-h-11 px-3 py-2 rounded-full border text-sm transition-colors';
function MockChip({ on, onClick, children, style }: { on: boolean; onClick: () => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={style}
      className={`${chipBase} ${on ? 'border-[var(--color-border-accent)] text-[var(--color-text-primary)] font-medium' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
      {children}
    </button>
  );
}

/* ───────── in the moment: the unblend line in its hosts ───────── */

/** The real hook (parts on, parts content, ext.unblendShown) inside a host mock; picks are chips you can change. */
function UnblendLine({ source, pick, children }: { source: UnblendSource; pick: string | null; children: (line: string | null) => ReactNode }) {
  const line = useUnblendLine(source, pick, pick !== null);
  return <>{children(line)}</>;
}

function FtfHost({ room, initial }: { room: 'shape' | 'tune'; initial: string }) {
  const [urges, setUrges] = useState<FeelingUrge[]>([]);
  const [title, setTitle] = useState('');
  const [pick, setPick] = useState<string>(initial);
  useEffect(() => {
    getFindTheFeelingContent().then((c) => { setUrges(c.urges); setTitle(c.flow.copy.pull?.title ?? ''); }).catch(() => {});
  }, []);
  const chips = (style?: CSSProperties) => (
    <div className="flex flex-wrap gap-2">
      {urges.map((u) => <MockChip key={u.id} on={pick === u.id} onClick={() => setPick(u.id)} style={style}>{u.label}</MockChip>)}
    </div>
  );
  return (
    <ToolSessionProvider toolId="find-the-feeling">
      <UnblendLine source="ftf" pick={pick}>
        {(line) => room === 'shape' ? (
          <div className="sr-root rounded-2xl" style={{ height: 460, '--wall': DARK.wall, '--ink': DARK.ink, '--ink2': DARK.ink2, '--paper': DARK.paper, '--line': DARK.line, '--brass': DARK.brass } as CSSProperties}>
            <div className="sr-back"><button type="button" className="min-h-11 px-2">← Back</button></div>
            {line && <p className="sr-small sr-unblend" role="status" data-testid="unblend-line">{line}</p>}
            <div className="sr-bottom" style={{ pointerEvents: 'auto' }}>
              <h2 className="sr-title" style={{ marginBottom: 12 }}>{title}</h2>
              {chips({ color: 'var(--ink)', borderColor: 'var(--line)' })}
            </div>
          </div>
        ) : (
          <div className="ftf-tune relative rounded-2xl overflow-hidden" style={{ height: 460, background: 'var(--t-bg)', color: 'var(--t-ink)' }}>
            <div className="flex items-center px-4 pt-3 pb-1 min-h-14"><button type="button" className="min-h-11 px-2" style={{ color: 'var(--t-ink)' }}>← Back</button></div>
            {line && <p role="status" data-testid="unblend-line" className="px-5 pb-1 text-sm" style={{ color: 'var(--t-ink-2)' }}>{line}</p>}
            <div className="px-5 pt-6 space-y-4">
              <h2 className="text-xl" style={{ color: 'var(--t-ink)' }}>{title}</h2>
              {chips({ color: 'var(--t-ink)', borderColor: 'var(--t-key-line)' })}
            </div>
          </div>
        )}
      </UnblendLine>
    </ToolSessionProvider>
  );
}

/** Do the Opposite's urge step and Recover's pull step: the picks by id (their labels come from callables). */
function ListHost({ source, toolId, title, picks, initial }: { source: UnblendSource; toolId: string; title: string; picks: string[]; initial: string }) {
  const [pick, setPick] = useState(initial);
  const id = source === 'recover' ? recoverPullOption(pick) : pick;
  return (
    <ToolSessionProvider toolId={toolId}>
      <div className="space-y-4 p-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]">
        <p className={mockNote}>{title} (mock host step, picks by id)</p>
        <div className="flex flex-wrap gap-2">
          {picks.map((p) => <MockChip key={p} on={pick === p} onClick={() => setPick(p)}>{p}</MockChip>)}
        </div>
        <UnblendLine source={source} pick={id}>
          {(line) => (line ? <p role="status" data-testid="unblend-line" className={secondaryText}>{line}</p>
            : <p className={mockNote}>No line for this pick (no move, or not one move).</p>)}
        </UnblendLine>
      </div>
    </ToolSessionProvider>
  );
}

const OA_URGES = ['shame-hide', 'anger-lash', 'jealousy-check', 'fear-avoid', 'guilt-punish', 'shame-shrink', 'sad-give-up', 'guilt-apologize'];

/* ───────── in the moment: the angry card ───────── */

function AngryHost({ plain, branch }: { plain: boolean; branch: string }) {
  const content = useParts();
  const [run, setRun] = useState(0);
  const [ended, setEnded] = useState<string | null>(null);
  if (!content) return null;
  const partsOn = !plain;
  const name = branch === 'noname' ? null : 'Sam';
  if (ended) {
    return (
      <div className="space-y-3">
        <p className={mockNote}>Recover goes on ({ended})</p>
        <button type="button" className={linkButton} onClick={() => { setEnded(null); setRun((n) => n + 1); }}>Start the card again</button>
      </div>
    );
  }
  return (
    <ToolSessionProvider toolId="recovering-from-invalidation">
      <AngryPartCard key={run} copy={angryCopyFrom(content, partsOn)} partsOn={partsOn} name={name}
        hurts={orderHurts(content.hurts, content.canTouch, 'brushed')}
        onSkip={() => { logEvent('Recover ext.wmp', { angryExit: 'skipped', angryVoteHeld: false }); setEnded('Not now'); }}
        skipLabel={angryCopyFrom(content, partsOn)[angryNotNowId(partsOn)]}
        onDone={(r) => { logEvent('Recover ext.wmp', { angryExit: r.exitStep, angryHurtId: r.hurtId, angryVoteHeld: r.voteHeld }); setEnded('Done'); }}
        later={angryLaterCopy(content, partsOn)}
        onLater={async () => { await queuePartCandidate({ id: '00000000-0000-4000-8000-000000000401', origin: 'angry_card', moveIds: ['hit_back'] }); }}
        tooMuch={<TooMuchLink host="recovering-from-invalidation" onResult={(r) => logEvent('Recover handoff', r)} />} />
    </ToolSessionProvider>
  );
}

/* ───────── over weeks ───────── */

function CheckbackHost({ named, two = false }: { named: boolean; two?: boolean }) {
  const content = useParts();
  const [gone, setGone] = useState(false);
  if (!content) return null;
  if (gone) return <HostNext>The card leaves Today.</HostNext>;
  return <PartCheckbackCard item={two ? checkbackItemTwo() : checkbackItem(named)} content={content} onDone={() => setGone(true)} />;
}

type TagHostKind = 'five' | 'pause' | 'ftf';
const TAG_HOSTS: Record<TagHostKind, { toolId: 'five-senses' | 'pause' | 'find-the-feeling'; note: string }> = {
  five: { toolId: 'five-senses', note: 'Five senses, after a better answer' },
  pause: { toolId: 'pause', note: 'Pause, after Held off' },
  ftf: { toolId: 'find-the-feeling', note: 'Find the feeling, after a better answer, in a visit that made a shape' },
};

function TagHost({ host }: { host: TagHostKind }) {
  const content = useParts();
  const [saved, setSaved] = useState('');
  useEffect(() => { getSpineContent().then((c) => setSaved(c.closeFlow.saved)).catch(() => {}); }, []);
  if (!content) return null;
  const h = TAG_HOSTS[host];
  return (
    <div className="space-y-2">
      <p className={mockNote}>{h.note} (mock host close)</p>
      <p role="status" className="mt-4 text-sm text-center text-[var(--color-text-tertiary)]">{saved}</p>
      <PartTagRow toolId={h.toolId} toolSessionId="00000000-0000-4000-8000-000000000501" content={content} offerShape={host === 'ftf'} />
    </div>
  );
}

function MeHost({ long = false }: { long?: boolean }) {
  const content = useParts();
  const copy = partsOfMeCopy(content);
  if (!content || !copy) return null;
  return (
    <section className="space-y-2">
      <p className={mockNote}>Me → Parts of me</p>
      <PartsOfMe items={long ? ME_LONG : ME_ITEMS} candidates={long ? [] : CANDIDATES} content={content} copy={copy}
        onWrite={(p) => p.then(() => undefined)}
        onDismiss={async (id) => { await answerPartCandidate(dismissCandidateRequest(id)); }} />
    </section>
  );
}

function SettingsHost({ on }: { on: boolean }) {
  const [enabled, setEnabled] = useState(on);
  return (
    <section className="space-y-2 p-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)]">
      <p className={mockNote}>Settings → Privacy &amp; data</p>
      <PartsSettings enabled={enabled} onToggle={async (v) => { logEvent('updateUserProfile', { partsEnabled: v }); setEnabled(v); }} />
    </section>
  );
}

function CopeHost() {
  const content = useParts();
  const s = slices();
  const [picked, setPicked] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<Record<string, string>>(s.partAnchors);
  const [gone, setGone] = useState(false);
  if (!content) return null;
  if (gone) return <HostNext>DEAR MAN goes on to Describe.</HostNext>;
  return (
    <section className="space-y-2">
      <p className={mockNote}>DEAR MAN, before the script</p>
      <CopeAheadStep content={content} parts={copeParts(s.parts)} anchors={anchors} lines={keptLines(s.ownLines, s.savedLines)}
        picked={picked} onPick={(id) => { setPicked(id); logEvent('DEAR MAN ext.er', { copeAheadPartId: id }); }}
        onAnchor={(partId, text) => setAnchors((a) => ({ ...a, [partId]: text }))}
        onGoOn={() => setGone(true)} />
    </section>
  );
}

function OfferHost({ kind }: { kind: TrailKind }) {
  const content = useParts();
  const [gone, setGone] = useState(false);
  if (!content) return null;
  if (gone) return <HostNext>The card leaves Today.</HostNext>;
  return (
    <section className="space-y-2">
      <p className={mockNote}>Today</p>
      <TrailOfferCard item={trailItem(kind)} content={content} onDone={() => setGone(true)} />
    </section>
  );
}

/** The unnamed part's chip (dev/review/data.ts: first felt in the stomach), as the tag row labels it. */
const UNNAMED_CHIP = 'The one in your stomach';

/** The kept line the cope-ahead failure branch picks (dev/review/data.ts savedLines). */
const KEPT_LINE = 'It makes sense this got to you.';

function DebriefHost({ named }: { named: boolean }) {
  const content = useParts();
  const [gone, setGone] = useState(false);
  if (!content) return null;
  if (gone) return <HostNext>DEAR MAN goes on to the reflection.</HostNext>;
  return (
    <section className="space-y-2">
      <p className={mockNote}>DEAR MAN debrief, after “Underneath that”</p>
      <DebriefWho content={content} parts={slices().parts} copeAheadPartId={named ? PART_IDS.chase : null}
        toolSessionId="00000000-0000-4000-8000-000000000601"
        onAnswer={(a) => logEvent('DEAR MAN ext.er', { whoShowedUp: a })} onDone={() => setGone(true)} />
    </section>
  );
}

/** Problem Solve's ambivalence answer screen, its own copy from the schema, with the real line under it. */
function PsHost() {
  const content = useParts();
  const later = psLaterCopy(content, true, PS_AMBIVALENCE_BARRIER);
  const pick = hostCopy.ambivalence[0];
  if (!content || !later || !pick) return null;
  return (
    <ToolSessionProvider toolId="problem-solve">
      <div className="space-y-6">
        <p className={mockNote}>Problem Solve · after “{pick.label}” (mock host screen)</p>
        <div className="p-6 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
          <p className="text-[var(--color-text-primary)]">{pick.follow}</p>
        </div>
        <button type="button" className="w-full py-3 px-4 rounded-lg bg-[var(--color-accent-fill)] text-[var(--color-on-accent)] font-medium lift-primary">Let’s keep going</button>
        <PartLaterLine ask={later.ask} done={later.done} onLater={async () => { await queuePartCandidate(psLaterCandidate('00000000-0000-4000-8000-000000000701')); }} />
      </div>
    </ToolSessionProvider>
  );
}

/** Urge × goal pairs: lines for a few moves, and two that show nothing. */
const OA_GOAL_PAIRS: [urge: string, goal: string, note?: string][] = [
  ['shame-hide', 'connection'], ['anger-lash', 'boundary'], ['jealousy-check', 'connection'], ['fear-avoid', 'progress'],
  ['guilt-apologize', 'self_respect'], ['guilt-punish', 'repair', 'safety-line move: nothing'], ['custom', 'connection', 'My urge is different: nothing'],
];

function GoalLineHost({ urgeId, goalLabel }: { urgeId: string; goalLabel: string | null }) {
  const lines = useOaGoalLine({ urgeId, goalLabel }, true);
  const oa = hostCopy.oa;
  const [value, setValue] = useState('');
  return (
    <TapCard index={3} total={4} question={oa.copy.effectiveness} options={oa.choices.effectiveness} value={value}
      onSelect={(id) => setValue(id)} onPrevious={() => {}}
      describedBy={lines ? 'oa-goal-line' : undefined} before={lines ? <OaGoalLine id="oa-goal-line" lines={lines} /> : null} />
  );
}

function OaGoalHost({ urgeId, goalId }: { urgeId: string; goalId: string }) {
  const goal = hostCopy.oa.choices.goal.find((g) => g.id === goalId) ?? null;
  return (
    <ToolSessionProvider toolId="opposite-action">
      <div className="space-y-2">
        <p className={mockNote}>Do the Opposite · urge {urgeId} · goal “{goal?.label ?? goalId}” (the real check card)</p>
        <GoalLineHost urgeId={urgeId} goalLabel={goal?.label ?? null} />
      </div>
    </ToolSessionProvider>
  );
}

/* ───────── Meet a part ───────── */

const clear: PartsEntry = { open: 'clear', reasons: [] };
const prefix = (move: string): DriveStep[] => [{ move }, { opt: 'blend_notice' }];
const toAge = (move: string): DriveStep[] => [...prefix(move), { opt: 'where_nowhere' }, { shape: true }];
const toFeel = (move: string, voice: string): DriveStep[] => [...toAge(move), { opt: 'age_now' }, { opt: voice }];
const toGuards = (move: string, voice: string, job: string): DriveStep[] =>
  [...toFeel(move, voice), { opt: 'feel_curious' }, { opt: job }, { opt: 'likes_tired' }, { opt: 'guards_not_sure' }];
// The harness person keeps other parts, so 5d comes after Guards (lane 2): "Not sure" goes on to Fear.
const toFear = (move: string, voice: string, job: string): DriveStep[] => [...toGuards(move, voice, job), { opt: 'front_not_sure' }];
const hideFear = toFear('hide', 'hide_voice_see', 'hide_job_pushed_out');
const toKeep: DriveStep[] = [
  ...hideFear, { opt: 'hide_fear_too_much' }, { opt: 'update_yes' }, { press: 'meet_thank_hold' }, { tap: 'Next' },
  { opt: 'hide_rather_break' }, { type: 'the hider' }, { tap: 'Next' },
];
const dangerThanks: DriveStep[] = [...toFear('hit_back', 'hit_back_voice_cant_talk', 'hit_back_job_seriously'), { opt: 'hit_back_fear_take_back' }];

interface MeetBranch extends Branch { gate?: PartsEntry; partId?: string }
const MEET_BRANCHES: MeetBranch[] = [
  { id: 'walk', label: 'Walk it yourself (from Find)' },
  { id: 'running', label: 'Running things → P2', steps: [{ move: 'hide' }, { opt: 'blend_running' }] },
  { id: 'dissociation', label: 'Flood signal + dissociation history → P2 leads with orienting', gate: { open: 'p2', band: 'flooded', crisis: false, reasons: ['dissociation_history'] } },
  { id: 'far_away', label: 'Far away → the heads-up', gate: { open: 'far_away', reasons: ['dissociation_history'] } },
  { id: 'tender', label: 'The tender path', steps: [...toAge('hide'), { opt: 'age_little' }, { opt: 'young_gentle' }] },
  { id: 'stop_tender', label: 'Conservative stop: a tender fear', steps: [...hideFear, { opt: 'fear_old_hurt' }] },
  { id: 'stop_own', label: 'Conservative stop: own words at the fear', steps: [...hideFear, { opt: 'own_words' }, { type: 'that it all comes back' }, { tap: 'Next' }] },
  { id: 'danger', label: 'Danger answer → Thanks with the crisis banner', steps: dangerThanks },
  { id: 'danger_close', label: 'Danger ending (close answered, no check-back)', steps: [...dangerThanks, { press: 'meet_thank_hold' }, { tap: 'Next' }, { close: 'better' }] },
  { id: 'nothing', label: 'Nothing there', steps: [...toFeel('hide', 'hide_voice_see'), { opt: 'feel_nothing' }] },
  { id: 'worried', label: 'A worried part → unblend', steps: [...toFeel('hide', 'hide_voice_see'), { opt: 'feel_annoyed' }] },
  { id: 'worried_end', label: 'A worried part, still there → the end', steps: [...toFeel('hide', 'hide_voice_see'), { opt: 'feel_annoyed' }, { opt: 'unblend_still' }] },
  { id: 'too_many', label: 'Too many parts lately: the line', gate: { ...clear, tooMany: true } },
  { id: 'paused', label: 'A paused part: the heads-up', gate: { ...clear, paused: true }, partId: PART_IDS.chase },
  { id: 'keep', label: 'Name it and keep it', steps: toKeep },
  { id: 'close', label: 'The orienting close and the check-back question', steps: [...toKeep, { opt: 'keep_yes' }, { close: 'better' }] },
  // ---- 5d (lane 2): "Does it stand in front of another part you know?" ----
  { id: 'front', label: '5d: does it stand in front of another part you know? (their parts by name)', steps: toGuards('hide', 'hide_voice_see', 'hide_job_pushed_out') },
  { id: 'front_keep', label: '5d: one of their parts picked, then kept (the den draws the thread)', steps: [
    ...toGuards('hide', 'hide_voice_see', 'hide_job_pushed_out'), { tap: 'the one who chases' }, { opt: 'hide_fear_too_much' }, { opt: 'update_yes' },
    { press: 'meet_thank_hold' }, { tap: 'Next' }, { opt: 'hide_rather_break' }, { type: 'the hider' }, { tap: 'Next' },
  ] },
  // ---- end 5d ----
];

/* ───────── Two pulls (lane 3's block) ───────── */

const pullsSetOut: DriveStep[] = [{ opt: 'blend_pulls_notice' }];
const pullsFeel: DriveStep[] = [...pullsSetOut, { tap: 'Next' }];
const pullsStepBack: DriveStep[] = [...pullsFeel, { opt: 'feel_curious' }, { opt: 'feel_steady' }];
const pullsWorries: DriveStep[] = [...pullsStepBack, { press: 'meet_thank_hold' }, { tap: 'Next' }];
const pullsBothWant: DriveStep[] = [...pullsWorries, { opt: 'chase_worry_drift' }, { opt: 'hide_worry_too_much' }];
const pullsKeepsake: DriveStep[] = [...pullsBothWant, { opt: 'want_not_left' }];
const PULLS_BRANCHES: Branch[] = [
  { id: 'set_out', label: 'Set them out (two kept parts, from the den)', steps: pullsSetOut },
  { id: 'running', label: 'One of them is running things → P2', steps: [{ opt: 'blend_pulls_running' }] },
  { id: 'feel_both', label: 'Feel toward, both: the second side', steps: [...pullsFeel, { opt: 'feel_curious' }] },
  { id: 'unblend', label: 'A non-Self answer → one unblend', steps: [...pullsFeel, { opt: 'feel_annoyed' }] },
  { id: 'needs_time', label: 'Still there → one of them needs its own time', steps: [...pullsFeel, { opt: 'feel_annoyed' }, { opt: 'unblend_still' }] },
  { id: 'step_back', label: 'Step back', steps: pullsStepBack },
  { id: 'worries', label: 'Each side\'s worry (the first)', steps: pullsWorries },
  { id: 'worry_own', label: 'Own words at a worry → the conservative stop', steps: [...pullsWorries, { opt: 'own_words' }, { type: 'they would go' }, { tap: 'Next' }] },
  { id: 'both_want', label: 'What they both want', steps: pullsBothWant },
  { id: 'keepsake', label: 'The keepsake', steps: pullsKeepsake },
  { id: 'kept', label: 'Keepsake kept: the close and the check-back question', steps: [...pullsKeepsake, { opt: 'pulls_keep' }, { close: 'better' }] },
  { id: 'pair_only', label: 'Pair only (from a rule C trail): neutral figures named by their moves', steps: pullsSetOut },
  { id: 'pair_needs_time', label: 'Pair only: needs its own time → Meet it another time queues it', steps: [...pullsFeel, { opt: 'feel_annoyed' }, { opt: 'unblend_still' }, { opt: 'pulls_another_time' }] },
  { id: 'general', label: 'Two parts with no pair of their own: the general chips, and still a keepsake',
    steps: [...pullsWorries, { opt: 'pulls_worry_hurt' }, { opt: 'pulls_worry_fall_apart' }, { opt: 'pulls_want_safe' }] },
  { id: 'not_found', label: 'An address it can\'t resolve (a part no longer kept): "Tool not found."' },
];
const PULLS_PAIR = new Set(['pair_only', 'pair_needs_time']);
/** The general branch: the chase part and the unnamed one (keep_watch), which no pair joins. */
const pullsSearch = (b: string) => (PULLS_PAIR.has(b) ? `?pair=chase_hide&offer=${encodeURIComponent('trail_two_pulls:chase+hide:ctx_event_ignored')}`
  : b === 'general' ? `?a=${PART_IDS.chase}&b=${PART_IDS.unnamed}`
  : b === 'not_found' ? `?a=${PART_IDS.chase}&b=00000000-0000-4000-8000-000000000999`
  : `?a=${PART_IDS.chase}&b=${PART_IDS.hide}`);

/* ───────── the list ───────── */

// ---- The den (lane 2): Me → Parts of me → See them together ----

const DEN_NOW = new Date('2026-10-17T12:00:00Z');
const denSig = (i: number) => vecToSig(PARTS[i].shape);
/** Five parts: two placed, a thread between them, one arriving at the edge of the light, a resting one, a tender one. */
function denData(one: boolean): GetDenResponse {
  const parts: GetDenResponse['parts'] = [
    { id: PART_IDS.chase, name: PARTS[0].name, status: 'active', tender: false, shapeSig: denSig(0), mapX: 0.3, mapY: 0.32, recency: 'near', safety: false },
    { id: PART_IDS.hide, name: PARTS[1].name, status: 'active', tender: false, shapeSig: denSig(1), mapX: 0.72, mapY: 0.36, recency: 'a_while', safety: false },
    { id: PART_IDS.critic, name: PARTS[2].name, status: 'active', tender: false, shapeSig: denSig(2), mapX: null, mapY: null, recency: 'not_lately', safety: true },
    { id: PART_IDS.peace, name: PARTS[3].name, status: 'resting', tender: false, shapeSig: denSig(3), mapX: 0.22, mapY: 0.78, recency: 'a_while', safety: false },
    { id: PART_IDS.little, name: PARTS[4].name, status: 'active', tender: true, shapeSig: null, mapX: 0.7, mapY: 0.74, recency: 'near', safety: false },
  ];
  if (one) return { parts: parts.slice(0, 1), links: [], snapshots: [] };
  return {
    parts,
    links: [{ id: `covers_for_${PART_IDS.chase}_${PART_IDS.hide}`, kind: 'covers_for', aId: PART_IDS.hide, bId: PART_IDS.chase, bothWantId: null }],
    snapshots: [{ id: 'den_2026-08-20', takenAt: '2026-08-20T18:00:00.000Z' }, { id: 'den_2026-10-02', takenAt: '2026-10-02T18:00:00.000Z' }],
  };
}

function DenHost({ one }: { one: boolean }) {
  const content = useParts();
  const copy = denCopy(content);
  if (!content || !copy) return null;
  return (
    <section className="space-y-2">
      <p className={mockNote}>Me → Parts of me → See them together</p>
      <Den copy={copy} initial={denData(one)} twoPullsAvailable now={DEN_NOW} content={content} storyCopy={partStoryCopy(content)} />
    </section>
  );
}

const DEN_SURFACE: Surface = {
  id: 'den', pack: 'den', title: 'The den',
  who: 'Parts on, two or more parts: Me → Parts of me → See them together. Drag (or Enter, arrows, Enter) to place; tap one figure then another for a thread.',
  branches: [
    { id: 'room', label: 'The room: placed, arriving, resting, tender, a thread, the safety flag' },
    { id: 'one', label: 'One part' },
    { id: 'sheet', label: 'Tap two: the thread sheet', steps: [{ tap: PARTS[0].name }, { tap: PARTS[2].name }] },
    { id: 'front', label: 'Which one stands in front?', steps: [{ tap: PARTS[0].name }, { tap: PARTS[2].name }, { prompt: 'den_stands_front' }] },
    { id: 'then', label: 'How it looked in August, beside now', steps: [{ tap: 'How it looked in August' }] },
  ],
  setup: (b) => {
    answer('getDen', () => denData(b === 'one'));
    answer('getDenSnapshot', () => ({
      takenAt: '2026-08-20T18:00:00.000Z',
      parts: [
        { id: PART_IDS.chase, mapX: 0.5, mapY: 0.3, status: 'active', tender: false },
        { id: PART_IDS.peace, mapX: 0.3, mapY: 0.7, status: 'active', tender: false },
      ],
    }));
    answer('updatePartLayout', () => ({ version: 2 }));
    answer('linkParts', () => ({ id: 'link', created: true, version: 3 }));
    answer('unlinkParts', () => ({ removed: true, version: 4 }));
  },
  render: ({ branch }) => <DenHost one={branch === 'one'} />,
};
// ---- end the den ----

// ---- A part's story (lane 2): on its card in Parts of me, and from one figure in the den ----

const LONG_OWN_JOB = 'make sure nobody I love can quietly drift away without me noticing first, so I keep checking, asking, reading every message twice, and I never get caught off guard by a goodbye I could see coming soon';
/** The longest story: every line, a long own-words job, three helped lines, both feel-toward lines, three threads, then and now rooms. */
function storyRich(): GetPartStoryResponse {
  return {
    moments: [
      { kind: 'met', month: '2026-04' },
      { kind: 'rested', month: '2026-06' },
      { kind: 'back', month: '2026-07' },
      { kind: 'job', month: '2026-08', then: { jobIds: [], ownJob: LONG_OWN_JOB }, now: { jobIds: ['chase_rather_ask', 'hide_rather_need_someone'], ownJob: null } },
      { kind: 'rested', month: '2026-09' },
      { kind: 'back', month: '2026-10' },
    ],
    helped: [{ toolId: 'pause', n: 4 }, { toolId: 'recovering-from-invalidation', n: 3 }, { toolId: 'cool-down', n: 1 }],
    // Steps that helped at their longest: three steps, a long graph label among them.
    steps: [
      { stepId: 'oa_step_1', label: 'Let your shoulders drop and slow your breathing for a minute', n: 3 },
      { stepId: 'oa_step_2', label: 'Say one true thing out loud', n: 2 },
      { stepId: 'rx_exit_1', label: 'Step away and come back later', n: 1 },
    ],
    felt: { month: '2026-05', then: 'feel_annoyed', now: 'feel_warm' },
    links: [
      { role: 'behind', otherId: PART_IDS.hide, otherName: PARTS[1].name },
      { role: 'pulls', otherId: PART_IDS.critic, otherName: PARTS[2].name },
      { role: 'front', otherId: PART_IDS.unnamed, otherName: null },
    ],
    rooms: {
      thenMonth: '2026-06',
      then: [
        { id: PART_IDS.chase, mapX: 0.5, mapY: 0.24, status: 'resting', tender: false },
        { id: PART_IDS.peace, mapX: 0.3, mapY: 0.72, status: 'active', tender: false },
      ],
      now: [
        { id: PART_IDS.chase, name: PARTS[0].name, status: 'active', tender: false, shapeSig: denSig(0), mapX: 0.3, mapY: 0.32 },
        { id: PART_IDS.hide, name: PARTS[1].name, status: 'active', tender: false, shapeSig: denSig(1), mapX: 0.72, mapY: 0.36 },
        { id: PART_IDS.peace, name: PARTS[3].name, status: 'resting', tender: false, shapeSig: denSig(3), mapX: 0.22, mapY: 0.78 },
        { id: PART_IDS.little, name: PARTS[4].name, status: 'active', tender: true, shapeSig: null, mapX: 0.7, mapY: 0.74 },
      ],
      links: [{ id: `covers_for_${PART_IDS.chase}_${PART_IDS.hide}`, kind: 'covers_for', aId: PART_IDS.hide, bId: PART_IDS.chase, bothWantId: null }],
    },
  };
}
/** A tender part: the server never sends its job; here one is sent anyway, and the screen must not show it. */
function storyTender(): GetPartStoryResponse {
  return {
    moments: [
      { kind: 'met', month: '2026-08' },
      { kind: 'job', month: '2026-09', then: { jobIds: ['hide_job_out_of_sight'], ownJob: null }, now: { jobIds: ['hide_rather_need_someone'], ownJob: null } },
    ],
    helped: [{ toolId: 'cool-down', n: 3 }],
    steps: [],
    felt: { month: '2026-08', then: null, now: 'feel_curious' },
    links: [{ role: 'behind', otherId: PART_IDS.chase, otherName: PARTS[0].name }],
  };
}

function StoryHost({ tender }: { tender: boolean }) {
  const content = useParts();
  const copy = partStoryCopy(content);
  if (!content || !copy) return null;
  const name = tender ? PARTS[4].name : PARTS[0].name;
  return (
    <section className="space-y-2">
      <p className={mockNote}>Me → Parts of me → {name} → {copy.story_open}{tender ? ' (a tender part)' : ''}</p>
      <PartStory partId={tender ? PART_IDS.little : PART_IDS.chase} tender={tender} content={content} copy={copy}
        initial={tender ? storyTender() : storyRich()} />
    </section>
  );
}

const STORY_SURFACE: Surface = {
  id: 'story', pack: 'story', title: 'A part\'s story',
  who: 'Parts on: "Its story" on a part\'s card in Parts of me, or one figure tapped in the den. Months only; a tender part has no job line.',
  branches: [
    { id: 'rich', label: 'The longest story: every line, then and now rooms' },
    { id: 'tender', label: 'A tender part: the relationship lines only' },
    { id: 'card', label: 'From the card: Its story opens in place', steps: [{ prompt: 'story_open' }] },
    { id: 'den', label: 'From the den: one figure tapped, then Its story', steps: [{ tap: PARTS[0].name }, { prompt: 'story_open' }] },
  ],
  setup: (b) => {
    answer('getPartStory', () => storyRich());
    if (b === 'den') {
      answer('getDen', () => denData(false));
      answer('updatePartLayout', () => ({ version: 2 }));
    }
  },
  render: ({ branch }) => (branch === 'card' ? <MeHost /> : branch === 'den' ? <DenHost one={false} /> : <StoryHost tender={branch === 'tender'} />),
};
// ---- end a part's story ----

export const SURFACES: Surface[] = [
  {
    id: 'unblend_shape', pack: 'unblend', title: 'Unblend line: Find the feeling (Shape it)',
    who: 'Parts on: in Find the feeling’s Shape it room, right after the person picks what the feeling wants to do (never in the check-in, never while P2 is open).',
    branches: ['fight', 'chase', 'hide', 'blank'].map((id) => ({ id, label: id === 'blank' ? 'blank (no line)' : id })),
    render: ({ branch }) => <FtfHost room="shape" initial={branch} />,
  },
  {
    id: 'unblend_tune', pack: 'unblend', title: 'Unblend line: Find the feeling (Tune it)',
    who: 'Parts on: in Find the feeling’s Tune it room, right after the pull is picked.',
    branches: ['fight', 'chase', 'hide', 'blank'].map((id) => ({ id, label: id === 'blank' ? 'blank (no line)' : id })),
    render: ({ branch }) => <FtfHost room="tune" initial={branch} />,
  },
  {
    id: 'unblend_oa', pack: 'unblend', title: 'Unblend line: Do the Opposite',
    who: 'Parts on: in Do the Opposite’s urge step, once an urge with a move is picked (never for In my words).',
    branches: OA_URGES.map((id) => ({ id, label: id })),
    render: ({ branch }) => <ListHost source="oa" toolId="opposite-action" title="Do the Opposite · the urge" picks={OA_URGES} initial={branch} />,
  },
  {
    id: 'unblend_recover', pack: 'unblend', title: 'Unblend line: Recover',
    who: 'Parts on: in Recover, right after the pull is picked; the fight pull gets no line whenever the angry card could still come this visit.',
    branches: ['hide', 'chase', 'fight'].map((id) => ({ id, label: id })),
    render: ({ branch }) => <ListHost source="recover" toolId="recovering-from-invalidation" title="Recover · the pull" picks={['fight', 'chase', 'hide']} initial={branch} />,
  },
  {
    id: 'angry', pack: 'angry', title: 'The angry-part card',
    who: 'In Recover after the fight pull, once the person is out of the flooded band. Parts on: the parts wording and the later line; parts off: the plain twin (use Plain wording).',
    branches: [
      { id: 'first', label: 'First screen, with Not now' },
      { id: 'noname', label: 'First screen, no first name' },
      { id: 'protects', label: 'What it protects', steps: [{ opt: 'angry_next' }] },
      { id: 'vote', label: 'The vote of confidence', steps: [{ opt: 'angry_next' }, { hurt: 'brushed_off' }] },
      { id: 'speak', label: 'Speak for it, with the later line', steps: [{ opt: 'angry_next' }, { hurt: 'brushed_off' }, { press: 'angry_hold' }, { tap: 'Next' }] },
      { id: 'later', label: 'After “later?” is tapped', steps: [{ opt: 'angry_next' }, { hurt: 'brushed_off' }, { press: 'angry_hold' }, { tap: 'Next' }, { opt: 'angry_later' }] },
    ],
    render: ({ branch, plain }) => <AngryHost plain={plain} branch={branch} />,
  },
  {
    id: 'meet', pack: 'meet', title: 'Meet a part',
    who: 'Parts on, reached only by a link (Me, Settings, a candidate, an offer). Writes are listed under the frame, ids only.',
    branches: MEET_BRANCHES,
    routeState: (b) => {
      const partId = MEET_BRANCHES.find((x) => x.id === b)?.partId;
      return { parts: { trailheadKind: 'me', ...(partId ? { partId } : {}) } };
    },
    setup: (b) => { const g = MEET_BRANCHES.find((x) => x.id === b)?.gate ?? clear; answer('getPartsEntry', () => g); },
    render: () => <ToolSessionProvider toolId="meet-a-part"><MeetAPart /></ToolSessionProvider>,
  },
  // Two pulls (lane 3's block).
  {
    id: 'pulls', pack: 'pulls', title: 'Two pulls',
    who: 'Parts on, reached only by a link: the den with two kept parts, or a rule C trail offer’s More than one with its pair. Writes are listed under the frame, ids only.',
    branches: PULLS_BRANCHES,
    routeSearch: pullsSearch,
    render: () => <ToolSessionProvider toolId="two-pulls"><TwoPulls /></ToolSessionProvider>,
  },
  {
    id: 'checkback_two', pack: 'checkback', title: 'Week check-back after Two pulls (Today)',
    who: 'Parts on: on Today a week after Two pulls with two kept parts, when the person said yes to checking back with both.',
    branches: [
      { id: 'named', label: 'Both named' },
      { id: 'louder', label: 'Louder → aftercare (no pause)', steps: [{ opt: 'checkback_louder' }] },
    ],
    render: () => <CheckbackHost named two />,
  },
  {
    id: 'checkback', pack: 'checkback', title: 'Next-day check-back (Today)',
    who: 'Parts on: on Today the day after a visit, when the person said yes to the check-back question.',
    branches: [
      { id: 'named', label: 'A named part' },
      { id: 'unnamed', label: 'An unnamed part' },
      { id: 'louder', label: 'Louder → aftercare', steps: [{ opt: 'checkback_louder' }] },
    ],
    render: ({ branch }) => <CheckbackHost named={branch !== 'unnamed'} />,
  },
  {
    id: 'tag', pack: 'tag', title: 'Tag row: “Was this a part you know?”',
    who: 'Parts on: under the saved close of Cool Down, Five senses or Find the feeling after a better answer, or Pause and Urge Surfing after Held off. In Find the feeling, when the visit made a shape, a part chip first asks to give that part the shape.',
    branches: [
      { id: 'row', label: 'After a better answer' },
      { id: 'urge', label: 'After Held off (Pause, Urge Surfing)' },
      { id: 'new', label: 'A new one → later?', steps: [{ opt: 'tag_new_one' }] },
      { id: 'shape', label: 'Find the feeling: “Use this shape for {name}?”', steps: [{ tap: PARTS[0].name }] },
      { id: 'shape_unnamed', label: 'Find the feeling: an unnamed part', steps: [{ tap: UNNAMED_CHIP }] },
      { id: 'shape_done', label: 'Find the feeling: Yes → Done. (folds after a moment)', steps: [{ tap: PARTS[0].name }, { opt: 'tag_shape_yes' }] },
    ],
    render: ({ branch }) => <TagHost host={branch.startsWith('shape') ? 'ftf' : branch === 'urge' ? 'pause' : 'five'} />,
  },
  {
    id: 'me', pack: 'me', title: 'Parts of me (Me)',
    who: 'Parts on: Me → Parts of me. A card with its readout, a tender card, a resting card with its 30-day check-back, a set-aside row, then candidates.',
    branches: [
      { id: 'cards', label: 'The cards' },
      { id: 'long', label: 'At its longest: a 40-character name, a 200-character job in their words, four places, three helped lines' },
    ],
    render: ({ branch }) => <MeHost long={branch === 'long'} />,
  },
  ME_OFF_SURFACE,
  {
    id: 'reflect', pack: 'reflect', title: 'Reflect: parts',
    who: 'Parts on: in Reflect, once a kept part has at least one stat line.',
    // lane 2 (parts-reflect-feel): the line across all their parts above the blocks, changed since the 30 days before.
    render: () => <PartsReflect parts={REFLECT} feel={{ now: 'feel_curious', then: 'feel_scared' }} />,
  },
  {
    id: 'settings', pack: 'settings', title: 'Settings: parts',
    who: 'Everyone: Settings → Privacy & data. Off by default; turning it off hides everything and deletes nothing.',
    branches: [
      { id: 'on', label: 'Parts on' },
      { id: 'off', label: 'Parts off (turn it on for the Get to know link)' },
      { id: 'confirm', label: 'Delete: the confirm', steps: [{ prompt: 'settings_delete' }] },
      { id: 'failed', label: 'Delete: the failure line', steps: [{ prompt: 'settings_delete' }, { prompt: 'settings_delete_yes' }] },
      { id: 'done', label: 'Delete: done', steps: [{ prompt: 'settings_delete' }, { prompt: 'settings_delete_yes' }] },
      { id: 'lines', label: 'Delete: also the 2 kept Two pulls lines that name a part (ticked)', steps: [{ prompt: 'settings_delete' }, { tick: 'Also remove 2 kept lines that name your parts?' }] },
    ],
    setup: (b) => answer('deleteMyParts', () => { if (b === 'failed') throw new Error('review: delete fails'); return { deleted: { Part: 5 } }; }),
    render: ({ branch }) => <SettingsHost on={branch !== 'off'} />,
  },
  {
    id: 'cope', pack: 'dearman', title: 'DEAR MAN: cope ahead',
    who: 'Parts on, with kept parts: DEAR MAN’s cope-ahead step, before the script.',
    branches: [
      { id: 'pick', label: 'Who might show up?' },
      { id: 'anchor', label: 'A part with an anchor', steps: [{ tap: PARTS[0].name }] },
      { id: 'new', label: 'A part without one: pick a line', steps: [{ tap: PARTS[1].name }] },
      { id: 'failed', label: 'Save fails: the failure line', steps: [{ tap: PARTS[1].name }, { tap: KEPT_LINE }, { opt: 'cope_save' }] },
    ],
    setup: (b) => answer('setPartAnchor', () => { if (b === 'failed') throw new Error('review: save fails'); return { version: 2 }; }),
    render: () => <CopeHost />,
  },
  {
    id: 'debrief', pack: 'dearman', title: 'DEAR MAN: who showed up (debrief)',
    who: 'Parts on, with a kept part: DEAR MAN’s debrief, after “Underneath that”. Named when prep picked a part, else the general form.',
    branches: [
      { id: 'named', label: '“Did {name} show up?” (prep picked a part)' },
      { id: 'general', label: '“Was one of your parts there?”' },
      { id: 'general_new', label: 'General: A new one → later?', steps: [{ opt: 'tag_new_one' }] },
    ],
    render: ({ branch }) => <DebriefHost named={branch === 'named'} />,
  },
  {
    id: 'offer', pack: 'offer', title: 'The trail offer (Today)',
    who: 'Parts on, offers on: on Today, at most one at a time, when a pattern across tools passes its rule and the gates (no flooding, crisis or dissociation signal).',
    branches: [
      { id: 'a', label: 'A pull in a context (rule A)' },
      { id: 'b', label: 'One pull after another (rule B)' },
      { id: 'c', label: 'Two pulls in a context (rule C)' },
      { id: 'evidence', label: 'Show me: the evidence (A)', steps: [{ opt: 'offer_show' }] },
      { id: 'evidence_c', label: 'Show me: the evidence, two pulls (C)', steps: [{ opt: 'offer_show' }] },
      // Rule C's More than one opens Two pulls (its own surface below); the split is asked on the other shapes.
      { id: 'split', label: 'More than one (rule B): which feels like its own thing?', steps: [{ opt: 'offer_show' }, { opt: 'offer_more_than_one' }] },
    ],
    setup: (b) => {
      const kind: TrailKind = b === 'b' || b === 'split' ? 'B' : b === 'c' || b === 'evidence_c' ? 'C' : 'A';
      answer('getTrailOfferEvidence', () => trailEvidence(kind));
    },
    render: ({ branch }) => <OfferHost kind={branch === 'b' || branch === 'split' ? 'B' : branch === 'c' || branch === 'evidence_c' ? 'C' : 'A'} />,
  },
  {
    id: 'review', pack: 'review', title: 'Reflect: “Was this {name}?” (rule D)',
    who: 'Parts on, offers on: in Reflect, after the parts section; never a push, never near flooding, a crisis flag, repeated dissociation or a harm signal. One block per part rule D found (at most two), a row per moment.',
    branches: [
      { id: 'blocks', label: 'Two parts: a named one, an unnamed one with the safety flag (crisis resources alongside)' },
      { id: 'answered', label: 'A row answered Yes', steps: [{ opt: 'review_yes' }] },
      { id: 'done', label: 'Done: that block goes, the next part stays', steps: [{ opt: 'review_yes' }, { opt: 'review_done' }] },
      { id: 'failed', label: 'Done fails: the block stays as it was', steps: [{ opt: 'review_no' }, { opt: 'review_done' }] },
    ],
    setup: (b) => {
      answer('getReflectTrails', () => ({ ...reflectTrails(), patterns: [] }));
      answer('answerKnownPartReview', (d) => {
        if (b === 'failed') throw new Error('review: save fails');
        const r = d as { id: string; rows: { answer: string }[] };
        return { id: r.id, created: true, tagged: r.rows.filter((x) => x.answer === 'yes').length };
      });
    },
    render: () => <TrailsReflect />,
  },
  {
    id: 'patterns', pack: 'patterns', title: 'Reflect: plain patterns',
    who: 'Parts on: in Reflect, the trails answered “It’s how things go”, as plain statements with no parts language, until the person removes one.',
    branches: [
      { id: 'list', label: 'Two patterns (rules A and B)' },
      { id: 'removed', label: '× removes one', steps: [{ tap: '×' }] },
    ],
    setup: () => {
      answer('getReflectTrails', () => ({ reviews: [], patterns: reflectTrails().patterns }));
      answer('removeTrailPattern', (d) => ({ offerId: (d as { offerId: string }).offerId, removed: true }));
    },
    render: () => <TrailsReflect />,
  },
  {
    id: 'ps_later', pack: 'ps', title: 'Problem Solve: another time',
    who: 'Parts on: in Problem Solve, after “Part of me doesn’t actually want this to change” and its answer, under Let’s keep going.',
    branches: [
      { id: 'ask', label: 'The line' },
      { id: 'done', label: 'After the tap', steps: [{ opt: 'ps_later' }] },
    ],
    render: () => <PsHost />,
  },
  {
    id: 'oa_goal', pack: 'oa', title: 'Do the Opposite: the goal line',
    who: 'Parts on: on Do the Opposite’s “will it help you move toward your goal” card, when the urge EXPRESSES a move that isn’t a safety-line move.',
    branches: OA_GOAL_PAIRS.map(([urge, goal, note]) => ({ id: `${urge}.${goal}`, label: `${urge} × ${goal}${note ? ` (${note})` : ''}` })),
    render: ({ branch }) => <OaGoalHost urgeId={branch.split('.')[0]} goalId={branch.split('.')[1]} />,
  },
  DEN_SURFACE, // lane 2: the den
  WISE_MIND_PARTS_SURFACE, // lane 4: Wise mind's step back
  STORY_SURFACE, // lane 2: a part's story
  WISE_MIND_SURFACE, // lane 1: Wise mind (not a parts surface: dev/review/wiseMind.tsx)
  SAY_SURFACE, // lane 1: say something to it (dev/review/sayToPart.tsx)
  COPE_CLOSING_SURFACE, // lane 3: Cope Ahead's screens 5–7 (not a parts surface: dev/review/copeAheadClosing.tsx)
  COPE_AHEAD_SURFACE, // lane 1: Cope Ahead (not a parts surface: dev/review/copeAhead.tsx)
  COPE_AHEAD_AFTER_SURFACE, // lane 4: Cope Ahead's after card on Today (not a parts surface: dev/review/copeAheadAfter.tsx)
];

/** Not built on the tip, so not here (the report lists them). */
export const SKIPPED: string[] = [];
