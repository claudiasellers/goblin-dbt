import type { ComponentType } from 'react';
import type { EmbedOutput, EmbedOutputSchema, EmbedPropSpec } from '../../data/skillTypes';
import { BodyCard, BreathPacer, DoseTimer, OrientFind, SqueezeRelease } from './BodyEmbeds';
import { BoundaryLine } from './BoundaryLine';
import { HoldRingEmbed } from './HoldRingEmbed';
import { PartsLine } from './PartsLine';
import { PartLaterEmbed } from './PartLaterEmbed';
import { ProsConsCard, ProsConsReplay } from './ProsConsCard';
import { WitnessEmbed } from './WitnessEmbed';
import { RebellionCard } from './RebellionCard';
import { RescriptCard } from './RescriptCard';
import { KeepCardEmbed, PartAnchorEmbed, PlanSentenceEmbed, RehearsalEmbed } from './CopeAheadEmbeds';
import { WaitLockEmbed } from './WaitLockEmbed';
import { UrgeWave, WaveTrace } from './UrgeWave';
import { DebriefWhoEmbed } from './DebriefWhoEmbed';
import { MessageComposer } from './MessageComposer';

/**
 * The skill runtime's embeds (docs/design/skill-runtime.md, "Embeds"): a name the graph can place in a step
 * (a slot) or hand a whole screen to (a step of kind `embed`) → the component that renders it. Where an
 * embed sits and when it shows is data; what it is, is code. scripts/skills/content.py EMBEDS lists the
 * same names (tests/skill-runtime.test.mjs keeps them equal), so a skill can't name one the player lacks.
 *
 * An embed gets its props from the skill, the run's context in (`ctx`: ids only) and the run's answers as labels
 * (`picked`), and reports back:
 * `onShown` once it has rendered something (the run records it under the slot's `record`), and, for a
 * whole-screen embed, `onDone(output)`: the option ids it produced (the step's `answerAs` answer), own words if
 * it takes any, and measurements (seconds, counts; never a rating). Each embed declares the shape of what it
 * reports in EMBED_OUTPUTS (`EmbedOutputSchema`); the machine drops anything undeclared, and
 * tests/skill-contracts.test.mjs keeps it equal to content.py (docs/design/dbt-modules-plan.md C3b).
 */
export interface EmbedProps {
  props: Record<string, unknown>;
  ctx?: Readonly<Record<string, string>>;
  /** The run's answers as the person saw them: each answered field's labels in pick order, own words last. */
  picked?: Readonly<Record<string, readonly string[]>>;
  /** The same answers as ids (an emotion field's grid ids, for an embed that asks the server about them). */
  answerIds?: Readonly<Record<string, readonly string[]>>;
  /**
   * The tool's profile slices (PROFILE_NEEDS, the same `$p.*` the conditions read), or null while loading or signed
   * out. For an embed that shows something the person kept (Hold to wait's pros & cons replay); read-only.
   */
  profile?: Readonly<Record<string, unknown>> | null;
  /** The grid words a link or hand-off carried in (ids only, R16): Do the Opposite's doors pre-tick them. */
  carried?: readonly string[];
  onShown: () => void;
  onDone?: (output: EmbedOutput) => void;
  /**
   * True while something sits over the step (safety.open, or P2 from *This is too much right now*): the step stays
   * mounted, so an embed with a clock decides what that means for it (the read-through counts it as Stop).
   */
  covered?: boolean;
}

export const EMBEDS: Record<string, ComponentType<EmbedProps>> = {
  partsLine: PartsLine,
  partLater: PartLaterEmbed,
  holdRing: HoldRingEmbed,
  witness: WitnessEmbed,
  rebellionCard: RebellionCard,
  boundaryLine: BoundaryLine,
  rescriptCard: RescriptCard,
  planSentence: PlanSentenceEmbed,
  rehearsal: RehearsalEmbed,
  keepCard: KeepCardEmbed,
  partAnchor: PartAnchorEmbed,
  waitLock: WaitLockEmbed,
  debriefWho: DebriefWhoEmbed,
  prosConsCard: ProsConsCard,
  prosConsReplay: ProsConsReplay,
  doseTimer: DoseTimer,
  bodyCard: BodyCard,
  breathPacer: BreathPacer,
  squeezeRelease: SqueezeRelease,
  orientFind: OrientFind,
  urgeWave: UrgeWave,
  waveTrace: WaveTrace,
  messageComposer: MessageComposer,
};

export const EMBED_OUTPUTS: Record<keyof typeof EMBEDS, EmbedOutputSchema> = {
  partsLine: {},
  partLater: {},
  holdRing: { ids: ['held', 'partly', 'skipped'], measures: ['durationSec', 'doneCount', 'earlyCount'] },
  witness: { ids: ['yes', 'sort_of', 'no', 'none_fit', 'own', 'skip', 'seen'] },
  rebellionCard: { ids: ['now', 'today', 'week'] },
  boundaryLine: { ids: ['copied'] },
  rescriptCard: { ids: ['read', 'stopped'], measures: ['durationSec'] },
  planSentence: {},
  rehearsal: { ids: ['done'] },
  keepCard: {},
  partAnchor: {},
  waitLock: { ids: ['waited', 'back_early'], measures: ['durationSec'] },
  debriefWho: { ids: ['yes', 'a_bit', 'no', 'skip', 'general', 'not_shown'] },
  prosConsCard: { ids: ['read'], measures: ['durationSec'] },
  prosConsReplay: {},
  doseTimer: { ids: ['done', 'partly', 'skipped'], measures: ['durationSec'] },
  bodyCard: { ids: ['done', 'partly', 'skipped'], measures: ['durationSec'] },
  breathPacer: { ids: ['done', 'partly', 'skipped', 'dizzy'], measures: ['durationSec'] },
  squeezeRelease: { ids: ['done', 'partly', 'skipped'], measures: ['durationSec', 'doneCount'] },
  orientFind: { ids: ['done', 'partly', 'skipped'], measures: ['doneCount'] },
  urgeWave: {
    ids: ['still_here', 'fading', 'gone', 'bigger', 'ended_gone', 'ended_bigger', 'ended_not_now', 'ended_left', 'ended_long'],
    measures: ['durationSec', 'doneCount'],
  },
  waveTrace: { ids: ['read'] },
  messageComposer: { ids: ['copied', 'opened', 'dropped_sorry'] },
};

/**
 * What each embed takes from the skill (C3b "declared props"), mirrored in content.py EMBED_PROPS, which
 * build.py checks every step against; the player resolves `copy` props to the skill's text
 * (src/lib/skillRuntime/embedProps.ts) and passes nothing undeclared.
 */
export const EMBED_PROPS: Record<keyof typeof EMBEDS, Readonly<Record<string, EmbedPropSpec>>> = {
  partsLine: { promptId: { type: 'id' }, as: { type: 'enum', values: ['line', 'heading'], optional: true } },
  partLater: {},
  holdRing: {
    variant: { type: 'enum', values: ['press', 'timed', 'settle'] },
    seconds: { type: 'int', min: 1, max: 900 },
    holds: { type: 'int', min: 1, max: 10, optional: true },
    growthPct: { type: 'int', min: 100, max: 300, optional: true },
    maxSeconds: { type: 'int', min: 1, max: 900, optional: true },
    label: { type: 'copy' },
    runningLabel: { type: 'copy', optional: true },
    hint: { type: 'copy' },
    doneLabel: { type: 'copy', optional: true },
    next: { type: 'copy' },
    /** `from_start`: the quiet way on shows before any try (a body mode with no hold to wait out, DT-01's press). */
    wayOn: { type: 'enum', values: ['from_start'], optional: true },
  },
  witness: {
    moment: { type: 'id' },
    wordsFrom: { type: 'field', optional: true },
    emotionsFrom: { type: 'field', optional: true },
    next: { type: 'copy', optional: true },
  },
  rebellionCard: {
    squeezeField: { type: 'field' },
    functionField: { type: 'field' },
    pickField: { type: 'field' },
    against: { type: 'copy' },
    for: { type: 'copy' },
    fallback: { type: 'copy' },
    whenLabel: { type: 'copy' },
    now: { type: 'copy' },
    today: { type: 'copy' },
    week: { type: 'copy' },
  },
  boundaryLine: {
    field: { type: 'field' },
    field2: { type: 'field', optional: true },
    field3: { type: 'field', optional: true },
    shape: { type: 'enum', values: ['line', 'list'] },
    copyLabel: { type: 'copy', optional: true },
    copiedLabel: { type: 'copy', optional: true },
    selectedLabel: { type: 'copy', optional: true },
    next: { type: 'copy' },
  },
  messageComposer: {
    field: { type: 'field' },
    opener: { type: 'field', optional: true },
    reason: { type: 'field', optional: true },
    alt: { type: 'field', optional: true },
    repeatLabel: { type: 'copy', optional: true },
    sorryLine: { type: 'copy', optional: true },
    dropSorry: { type: 'copy', optional: true },
    explainLine: { type: 'copy', optional: true },
    copyLabel: { type: 'copy' },
    copiedLabel: { type: 'copy' },
    selectedLabel: { type: 'copy' },
    openLabel: { type: 'copy', optional: true },
    next: { type: 'copy' },
  },
  rescriptCard: {
    startField: { type: 'field' },
    turnField: { type: 'field' },
    endField: { type: 'field' },
    seconds: { type: 'int', min: 10, max: 300 },
    startLabel: { type: 'copy' },
    turnLabel: { type: 'copy' },
    endLabel: { type: 'copy' },
    fallback: { type: 'copy' },
    readLabel: { type: 'copy' },
    runningLabel: { type: 'copy' },
    stopLabel: { type: 'copy' },
    doneLabel: { type: 'copy' },
    skipLabel: { type: 'copy' },
  },
  // Cope Ahead (ER-B2, CopeAheadEmbeds.tsx): the plan's fields, for planLine.
  planSentence: {
    momentField: { type: 'field' },
    movesField: { type: 'field' },
    forpullField: { type: 'field', optional: true },
    pullField: { type: 'field' },
  },
  rehearsal: {
    momentField: { type: 'field' },
    movesField: { type: 'field' },
    forpullField: { type: 'field', optional: true },
    pullField: { type: 'field' },
    pass: { type: 'int', min: 1, max: 2 },
    changeField: { type: 'field', optional: true },
    changedMovesField: { type: 'field', optional: true },
  },
  keepCard: {
    momentField: { type: 'field' },
    movesField: { type: 'field' },
    forpullField: { type: 'field', optional: true },
    pullField: { type: 'field' },
    partField: { type: 'field', optional: true },
  },
  partAnchor: { partField: { type: 'field' } },
  waitLock: {
    minutes: { type: 'int', min: 1, max: 60 },
    waiting: { type: 'copy' },
    waitingShort: { type: 'copy' },
    done: { type: 'copy' },
    doneShort: { type: 'copy' },
    next: { type: 'copy' },
  },
  debriefWho: {},
  prosConsCard: {
    reasonsField: { type: 'field' },
    moreField: { type: 'field' },
    proField: { type: 'field' },
    reasonsLabel: { type: 'copy' },
    proLabel: { type: 'copy' },
    fallback: { type: 'copy' },
    next: { type: 'copy' },
  },
  prosConsReplay: {
    pullField: { type: 'field' },
    fromSkill: { type: 'id' },
    title: { type: 'copy' },
    reasonsLabel: { type: 'copy' },
    proLabel: { type: 'copy' },
    fallback: { type: 'copy' },
    noProFor: { type: 'id' },
    noteFor: { type: 'id' },
    note: { type: 'copy' },
  },
  doseTimer: {
    art: { type: 'enum', values: ['cold', 'none'], optional: true },
    seconds: { type: 'int', min: 5, max: 300 },
    leadIn: { type: 'int', min: 0, max: 5, optional: true },
    step1: { type: 'copy', optional: true },
    step2: { type: 'copy', optional: true },
    step3: { type: 'copy', optional: true },
    caution: { type: 'copy', optional: true },
    start: { type: 'copy' },
    running: { type: 'copy' },
    lead: { type: 'copy', optional: true },
    done: { type: 'copy' },
    next: { type: 'copy' },
  },
  bodyCard: {
    kind: { type: 'enum', values: ['hand_heart', 'wake', 'strong', 'still', 'press', 'willing'] },
    cue: { type: 'copy', optional: true },
    seconds: { type: 'int', min: 5, max: 300 },
    step1: { type: 'copy', optional: true },
    step2: { type: 'copy', optional: true },
    step3: { type: 'copy', optional: true },
    caution: { type: 'copy', optional: true },
    start: { type: 'copy' },
    running: { type: 'copy' },
    done: { type: 'copy' },
    next: { type: 'copy' },
  },
  breathPacer: {
    seconds: { type: 'int', min: 30, max: 300 },
    inSec: { type: 'int', min: 2, max: 6 },
    outSec: { type: 'int', min: 3, max: 10 },
    step1: { type: 'copy', optional: true },
    step2: { type: 'copy', optional: true },
    step3: { type: 'copy', optional: true },
    caution: { type: 'copy', optional: true },
    start: { type: 'copy' },
    inLabel: { type: 'copy' },
    outLabel: { type: 'copy' },
    dizzy: { type: 'copy' },
    done: { type: 'copy' },
    next: { type: 'copy' },
  },
  squeezeRelease: {
    rounds: { type: 'int', min: 1, max: 5 },
    squeezeSec: { type: 'int', min: 3, max: 8 },
    step1: { type: 'copy', optional: true },
    step2: { type: 'copy', optional: true },
    step3: { type: 'copy', optional: true },
    caution: { type: 'copy', optional: true },
    start: { type: 'copy' },
    squeezeLabel: { type: 'copy' },
    dropLabel: { type: 'copy' },
    done: { type: 'copy' },
    next: { type: 'copy' },
  },
  orientFind: {
    variant: { type: 'enum', values: ['find', 'listen'] },
    count: { type: 'int', min: 1, max: 5 },
    here: { type: 'copy' },
    task: { type: 'copy' },
    foundLabel: { type: 'copy' },
    done: { type: 'copy' },
    next: { type: 'copy' },
  },
  urgeWave: {
    checkSec: { type: 'int', min: 20, max: 180 },
    maxChecks: { type: 'int', min: 1, max: 10 },
    checkTitle: { type: 'copy' },
    riding: { type: 'copy' },
    still_here: { type: 'copy' },
    fading: { type: 'copy' },
    gone: { type: 'copy' },
    bigger: { type: 'copy' },
    /** Absent: no *not now* button (Ride it out's second ride). */
    notNow: { type: 'copy', optional: true },
    next: { type: 'copy' },
    /** A first ride's field: this ride's object starts where that one left it. */
    continueFrom: { type: 'field', optional: true },
  },
  waveTrace: {
    rideField: { type: 'field' },
    againField: { type: 'field', optional: true },
    downLine: { type: 'copy' },
    /** The down line when the trace rose first (a *bigger* tap); else `downLine`. */
    riseLine: { type: 'copy', optional: true },
    heldLine: { type: 'copy' },
    next: { type: 'copy' },
  },
};
