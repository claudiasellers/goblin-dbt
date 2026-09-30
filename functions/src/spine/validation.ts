/**
 * Validators for the tool-session callables (PR-S3). Pure: no firebase imports.
 * Messages name the rule, never the value.
 */
import { ValidationError, GRAPH_ID, obj, oneOf, str, uuid, intIn } from '../shared/validate';
import { validateCapacityReading } from '../capacity/reading';
import { THEN_VS_NOW, type CapacityReading, type ThenVsNow } from '../capacity/types';
import { validateExt } from './extSchemas';
import { RESERVED_ENTRIES, SPINE_TOOLS, thenVsNowDirFor } from './tools';
import {
  ACTED_ON_URGE, CLOSE_STATUSES, DETAIL_KINDS, REP_SOURCES, TOOL_ENTRIES,
  type ActedOnUrge, type CloseKind, type CloseStatus, type DetailKind, type RepSource, type SpineModule, type ToolEntry,
} from './types';

const STEP = /^[a-z0-9][a-z0-9_:-]{0,63}$/i;
const FLOW_VERSION = /^[a-z0-9][a-z0-9._-]{0,39}$/i;
const opt = <T>(v: unknown, f: (x: unknown) => T): T | null => (v === undefined || v === null || v === '' ? null : f(v));
const ids = (v: unknown, max: number): string[] => {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > max) throw new ValidationError(`Expected at most ${max} ids`);
  return [...new Set(v.map((x) => str(x, { max: 100, pattern: GRAPH_ID })))];
};
const reading = (v: unknown, now: Date): CapacityReading | null =>
  opt(v, (x) => validateCapacityReading(x, { now, allowSources: ['probe', 'ftf', 'carried', 'handoff'], freshMinutes: 20 }));

export interface StartInput {
  id: string;
  toolId: string;
  module: SpineModule;
  closeKind: CloseKind;
  flowVersion: string | null;
  entry: ToolEntry;
  checkInId: string | null;
  hostSessionId: string | null;
  followUpId: string | null;
  patternId: string | null;
  emotionIds: string[];
  bandAtStart: CapacityReading | null;
}

export function validateStart(raw: unknown, now: Date): StartInput {
  const d = obj(raw);
  const toolId = str(d.toolId, { max: 64 });
  const tool = SPINE_TOOLS[toolId];
  if (!tool) throw new ValidationError('Unknown tool');
  const entry = oneOf(d.entry ?? 'direct', TOOL_ENTRIES);
  const allowed = RESERVED_ENTRIES[toolId];
  if (allowed && !allowed.includes(entry)) throw new ValidationError('Tool not allowed from this entry');
  return {
    id: uuid(d.id),
    toolId,
    module: tool.module,
    closeKind: tool.closeKind,
    flowVersion: opt(d.flowVersion, (x) => str(x, { max: 40, pattern: FLOW_VERSION })),
    entry,
    checkInId: opt(d.checkInId, uuid),
    hostSessionId: opt(d.hostSessionId, uuid),
    followUpId: opt(d.followUpId, uuid),
    patternId: opt(d.patternId, (x) => str(x, { max: 100, pattern: GRAPH_ID })),
    emotionIds: ids(d.emotionIds, 20),
    bandAtStart: reading(d.bandAtStart, now),
  };
}

export interface CloseInput {
  id: string;
  status: CloseStatus;
  exitStep: string | null;
  practiced: boolean;
  thenVsNow: ThenVsNow | null;
  actedOnUrge: ActedOnUrge | null;
  bandAtEnd: CapacityReading | null;
  urgeIds: string[];
  durationSec: number | null;
  detail: { kind: DetailKind; id: string } | null;
  skillIds: string[];
  repSource: RepSource;
  ext: string | null;
}

/** `closeKind` is the tool's (from SPINE_TOOLS): an answer the kind doesn't ask is rejected. */
export function validateClose(raw: unknown, now: Date, closeKind?: CloseKind): CloseInput {
  const d = obj(raw);
  const thenVsNow = opt(d.thenVsNow, (x) => oneOf(x, THEN_VS_NOW));
  const actedOnUrge = opt(d.actedOnUrge, (x) => oneOf(x, ACTED_ON_URGE));
  if (closeKind) {
    if (thenVsNow && !thenVsNowDirFor(closeKind)) throw new ValidationError('This tool does not ask then-vs-now');
    if (actedOnUrge && closeKind !== 'urge') throw new ValidationError('This tool does not ask about the urge');
  }
  const detail = opt(d.detail, (x) => {
    const o = obj(x);
    return { kind: oneOf(o.kind, DETAIL_KINDS), id: uuid(o.id) };
  });
  return {
    id: uuid(d.id),
    status: oneOf(d.status, CLOSE_STATUSES),
    exitStep: opt(d.exitStep, (x) => str(x, { max: 64, pattern: STEP })),
    practiced: d.practiced === true,
    thenVsNow,
    actedOnUrge,
    bandAtEnd: reading(d.bandAtEnd, now),
    urgeIds: ids(d.urgeIds, 10),
    durationSec: opt(d.durationSec, (x) => intIn(x, { min: 0, max: 86_400 })),
    detail,
    skillIds: ids(d.skillIds, 20),
    repSource: oneOf(d.repSource ?? 'standalone', REP_SOURCES),
    ext: validateExt(d.ext),
  };
}

/** One-shot (help-now, micro-step, guided activity, FTF in the check-in): start + close together. */
export function validateRecord(raw: unknown, now: Date): { start: StartInput; close: CloseInput } {
  const start = validateStart(raw, now);
  const close = validateClose(raw, now, start.closeKind);
  return { start, close };
}

