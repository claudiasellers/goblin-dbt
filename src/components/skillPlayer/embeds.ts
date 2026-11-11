import type { ComponentType } from 'react';
import type { EmbedOutput, EmbedOutputSchema, EmbedPropSpec } from '../../data/skillTypes';
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
import { DebriefWhoEmbed } from './DebriefWhoEmbed';

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
};
